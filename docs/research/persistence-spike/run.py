import pgserver, psycopg2, uuid, time, json, random, hashlib, threading
pgserver.get_server('/tmp/pgspike/data', cleanup_mode=None)
dsn = dict(host='/tmp/pgspike/data', user='postgres', dbname='postgres')
def conn():
    c = psycopg2.connect(**dsn); c.autocommit = False; return c
su = conn(); cur = su.cursor(); cur.execute(open('/tmp/pgspike/schema.sql').read()); su.commit()
u = lambda: str(uuid.uuid4())
h = lambda s: hashlib.sha1(s.encode()).hexdigest()[:16]
A, B, PA, PB = u(), u(), u(), u()
cur.execute("insert into w.account values (%s),(%s)", (A,B))
cur.execute("insert into w.project values (%s,%s),(%s,%s)", (A,PA,B,PB))
from psycopg2.extras import execute_values
def mkobj(acct, proj, kind, n):
    ids=[u() for _ in range(n)]
    execute_values(cur, "insert into w.object(account_id,project_id,id,kind) values %s", [(acct,proj,i,kind) for i in ids]); return ids
def seed(acct, proj, shots=250, hist=6, attempts=4):
    ents = mkobj(acct,proj,'entity',40); blocks = mkobj(acct,proj,'block',300); style = mkobj(acct,proj,'style',1)
    shotids = mkobj(acct,proj,'shot',shots)
    units = [(o,'desc') for o in ents]+[(o,'look') for o in ents]+[(o,'text') for o in blocks]+[(style[0],'style')]
    revs=[]; heads=[]
    for o,_ in set((o,0) for o,_ in units): pass
    for o in ents+blocks+style+shotids:
        for s in range(1,hist+1):
            revs.append((acct,proj,o,s,json.dumps({'t':'x'*200}),json.dumps({k:h(f'{o}{k}{s}') for k in ('desc','look','text','style','action','dialogue')}),'creator_edit'))
        heads.append((o, hist))
    execute_values(cur,"insert into w.revision(account_id,project_id,object_id,seq,content,slice_hash,cause) values %s",revs, page_size=2000)
    cur.execute("insert into w.unit_head(account_id,project_id,object_id,slice,rev_seq,fingerprint) select account_id,project_id,object_id,k,seq,v from w.revision r, jsonb_each_text(r.slice_hash) e(k,v) where r.project_id=%s and r.seq=%s",(proj,hist))
    # slots, attempts, captures
    slots=[]; atts=[]; sstate=[]; caps=[]
    uh = {(o,s):fp for o,s,fp in []}
    cur.execute("select object_id,slice,fingerprint from w.unit_head where project_id=%s",(proj,)); uh={(o,s):f for o,s,f in cur.fetchall()}
    for sh in shotids:
        for role in ('open','end','take'):
            sl = mkobj(acct,proj,'slot',1)[0]; chosen=None
            for k in range(attempts):
                a=u(); atts.append((acct,proj,a,sl,None)); chosen=a if k==1 else chosen
                used = random.sample(ents,3)
                cu=[(sh,'action'),(sh,'dialogue'),(style[0],'style'),(random.choice(blocks),'text')]+[(e,'desc') for e in used]+[(e,'look') for e in used]
                for o,s in cu: caps.append((acct,proj,a,o,s,uh[(o,s)]))
            sstate.append((acct,proj,sl,sh,chosen))
    execute_values(cur,"insert into w.attempt(account_id,project_id,id,slot_id,generation_id) values %s",atts,page_size=2000)
    execute_values(cur,"insert into w.slot_state(account_id,project_id,slot_id,shot_id,chosen_attempt_id) values %s",sstate,page_size=2000)
    execute_values(cur,"insert into w.capture(account_id,project_id,dependant_id,unit_object_id,slice,fingerprint) values %s",caps,page_size=5000)
    return dict(ents=ents,style=style,shots=shotids,blocks=blocks)
t=time.time(); SA = seed(A,PA); SB = seed(B,PB, shots=30); su.commit(); print('seed s',round(time.time()-t,1))
cur.execute("select count(*) from w.capture where project_id=%s",(PA,)); print('captures A', cur.fetchone())
cur.execute("analyze"); su.commit()

def as_app(account, role='app_request'):
    c=conn(); k=c.cursor(); k.execute(f"set local role {role}"); k.execute("select set_config('app.account_id',%s,true)",(account,)); return c,k
# --- isolation tests
c,k=as_app(A); k.execute("select count(*) from w.object"); print('A sees objects', k.fetchone()[0]); 
k.execute("select count(*) from w.object where project_id=%s",(PB,)); print('A sees B project objects', k.fetchone()[0])
k.execute("select count(*) from w.revision where object_id=%s",(SB['shots'][0],)); print('A reads B shot revisions', k.fetchone()[0])
for name,sql,args in [
  ('A inserts row claiming account B', "insert into w.object(account_id,project_id,id,kind) values (%s,%s,%s,'shot')", (B,PB,u())),
  ('A inserts object in B project under A account (composite FK)', "insert into w.object(account_id,project_id,id,kind) values (%s,%s,%s,'shot')", (A,PB,u())),
  ('A capture referencing B unit (composite FK)', "insert into w.capture(account_id,project_id,dependant_id,unit_object_id,slice,fingerprint) values (%s,%s,%s,%s,'x','y')", (A,PA,u(),SB['shots'][0])),
  ('A updates revision (no grant)', "update w.revision set cause='x' where object_id=%s", (SA['shots'][0],)),
  ('A deletes attempt', "delete from w.attempt", ()),
]:
    c2,k2=as_app(A)
    try: k2.execute(sql,args); print('NOT REFUSED:',name, k2.rowcount)
    except Exception as e: print('refused:',name,'->',str(e).splitlines()[0][:90])
    c2.rollback()
# unset account => nothing
c3=conn(); k3=c3.cursor(); k3.execute("set local role app_request"); k3.execute("select count(*) from w.object"); print('no account set sees', k3.fetchone()[0]); c3.rollback()
# owner without superuser? (superuser always bypasses) ; trigger blocks even superuser mutate
try: cur.execute("update w.revision set cause='z' where object_id=%s",(SA['shots'][0],)); print('superuser update NOT blocked')
except Exception as e: print('trigger blocks superuser:',str(e).splitlines()[0]); su.rollback()
# dispatcher
cur.execute("insert into w.job(account_id,id,payload) values (%s,%s,'{\"secret\":1}'),(%s,%s,'{}')",(A,u(),B,u())); su.commit()
c4=conn(); k4=c4.cursor(); k4.execute("set local role app_dispatch")
try: k4.execute("select * from w.job"); print('dispatch read job NOT refused')
except Exception as e: print('dispatch cannot read job table:',str(e).splitlines()[0]); c4.rollback(); k4=c4.cursor(); k4.execute("set local role app_dispatch")
k4.execute("select * from w.claim_job()"); print('dispatch claim returns ids only:', k4.fetchall()); c4.commit()

# --- board summary at 250 shots, under RLS as app role
BOARD = """
select s.shot_id,
  count(*) filter (where ss.chosen_attempt_id is not null) as chosen,
  bool_or(exists (select 1 from w.capture c join w.unit_head uh on uh.object_id=c.unit_object_id and uh.slice=c.slice
        where c.dependant_id=ss.chosen_attempt_id and uh.fingerprint<>c.fingerprint
          and not exists (select 1 from w.ack a where a.dependant_id=c.dependant_id and a.unit_object_id=c.unit_object_id and a.slice=c.slice and a.fingerprint=uh.fingerprint))) as ood
from w.slot_state s join w.slot_state ss on ss.shot_id=s.shot_id and ss.slot_id=s.slot_id
where s.project_id=%s group by s.shot_id"""
def timeit(sql, args=(), n=5):
    ts=[]
    for _ in range(n):
        c,k=as_app(A); t=time.time(); k.execute(sql,args); rows=k.fetchall(); ts.append((time.time()-t)*1000); c.rollback()
    return round(min(ts),1), round(sorted(ts)[len(ts)//2],1), rows
mn,md,rows=timeit(BOARD,(PA,)); print('board 250 shots, nothing stale: min/median ms',mn,md,'rows',len(rows),'ood',sum(1 for r in rows if r[2]))
# edit style -> bump unit_head (as commit would, in one txn)
cur.execute("update w.unit_head set fingerprint='NEW', rev_seq=rev_seq+1 where object_id=%s and slice='style'",(SA['style'][0],)); su.commit()
mn,md,rows=timeit(BOARD,(PA,)); print('board after style edit: min/median ms',mn,md,'ood',sum(1 for r in rows if r[2]))
# impact: dependants of one entity desc, transitive via-reasons (depth 1 here) 
IMPACT="select count(distinct c.dependant_id) from w.capture c where c.unit_object_id=%s and c.slice='desc'"
mn,md,rows=timeit(IMPACT,(SA['ents'][0],)); print('impact of an entity description edit: ms',mn,md,'dependants',rows)
# x5 history stress
PA2=u(); cur.execute("insert into w.project values (%s,%s)",(A,PA2)); SA2=seed(A,PA2,shots=250,hist=30,attempts=20); su.commit(); cur.execute("analyze"); su.commit()
cur.execute("select count(*) from w.capture where project_id=%s",(PA2,)); print('captures big project', cur.fetchone())
cur.execute("select count(*) from w.revision where project_id=%s",(PA2,)); print('revisions big project', cur.fetchone())
cur.execute("update w.unit_head set fingerprint='NEW3' where object_id=%s and slice='style'",(SA2['style'][0],)); su.commit()
mn,md,rows=timeit(BOARD,(PA2,)); print('board 250 shots, 5x attempts, 5x revisions: min/median ms',mn,md,'ood',sum(1 for r in rows if r[2]))
mn,md,rows=timeit(IMPACT,(SA2['ents'][0],)); print('impact big: ms',mn,md,rows)
PA=PA2
# --- lock gate ordering demo
cur.execute("select pg_advisory_unlock_all()")
order=[]
def edit():
    c=conn(); k=c.cursor(); k.execute("select pg_advisory_xact_lock_shared(hashtext(%s))",(PA,)); order.append('edit-has-shared'); time.sleep(1.0); order.append('edit-commits'); c.commit()
def lock():
    time.sleep(0.2); c=conn(); k=c.cursor(); order.append('lock-wants-exclusive'); k.execute("select pg_advisory_xact_lock(hashtext(%s))",(PA,)); order.append('lock-acquired'); c.commit()
t1=threading.Thread(target=edit); t2=threading.Thread(target=lock); t1.start(); t2.start(); t1.join(); t2.join(); print('gate order',order)
# --- duplication set-based remap of whole project A (1 project copy)
t=time.time()
cur.execute("create temp table idmap as select id old, gen_random_uuid() new from w.object where project_id=%s",(PA,))
NP=u(); cur.execute("insert into w.project values (%s,%s)",(A,NP))
cur.execute("insert into w.object(account_id,project_id,id,kind) select o.account_id,%s,m.new,o.kind from w.object o join idmap m on m.old=o.id",(NP,))
cur.execute("insert into w.revision(account_id,project_id,object_id,seq,content,slice_hash,cause) select r.account_id,%s,m.new,r.seq,r.content,r.slice_hash,r.cause from w.revision r join idmap m on m.old=r.object_id",(NP,))
cur.execute("insert into w.unit_head(account_id,project_id,object_id,slice,rev_seq,fingerprint) select r.account_id,%s,m.new,r.slice,r.rev_seq,r.fingerprint from w.unit_head r join idmap m on m.old=r.object_id",(NP,))
cur.execute("create temp table amap as select id old, gen_random_uuid() new from w.attempt where project_id=%s",(PA,))
cur.execute("insert into w.attempt(account_id,project_id,id,slot_id) select a.account_id,%s,am.new,sm.new from w.attempt a join amap am on am.old=a.id join idmap sm on sm.old=a.slot_id",(NP,))
cur.execute("insert into w.capture(account_id,project_id,dependant_id,unit_object_id,slice,fingerprint) select c.account_id,%s,coalesce(am.new,dm.new),um.new,c.slice,c.fingerprint from w.capture c left join amap am on am.old=c.dependant_id left join idmap dm on dm.old=c.dependant_id join idmap um on um.old=c.unit_object_id where c.project_id=%s",(NP,PA))
cur.execute("insert into w.slot_state(account_id,project_id,slot_id,shot_id,chosen_attempt_id) select s.account_id,%s,sm.new,shm.new,am.new from w.slot_state s join idmap sm on sm.old=s.slot_id join idmap shm on shm.old=s.shot_id left join amap am on am.old=s.chosen_attempt_id",(NP,))
su.commit(); print('duplicate 1250-shot project (set-based, one txn) s', round(time.time()-t,2))
cur.execute("select count(*) from w.capture where project_id=%s",(NP,)); print('copied captures',cur.fetchone())
# purge by project = delete rows; measure
t=time.time(); 
cur.execute("select set_config('app.purging',%s,true)",(NP,))
for tbl in ['ack','capture','slot_state','attempt','unit_head']: cur.execute(f"delete from w.{tbl} where project_id=%s",(NP,))
cur.execute("delete from w.revision where project_id=%s",(NP,)); cur.execute("delete from w.attempt where project_id=%s",(NP,)); cur.execute("delete from w.object where project_id=%s",(NP,)); cur.execute("delete from w.project where id=%s",(NP,))
su.commit(); print('purge one project s', round(time.time()-t,2))
