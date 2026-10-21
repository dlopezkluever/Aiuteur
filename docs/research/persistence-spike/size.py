import pgserver, psycopg2, random, json, time
pgserver.get_server('/tmp/pgspike/data', cleanup_mode=None)
c=psycopg2.connect(host='/tmp/pgspike/data',user='postgres',dbname='postgres'); k=c.cursor()
k.execute("select relname, reltuples::bigint, pg_size_pretty(pg_total_relation_size(c.oid)) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='w' and relkind='r' order by pg_total_relation_size(c.oid) desc")
for r in k.fetchall(): print(r)
# document snapshot experiment: 150 KB master narrative, 300 revisions each editing one paragraph
random.seed(1)
vocab=[ ''.join(random.choice('abcdefghijklmnopqrstuvwxyz') for _ in range(random.randint(2,9))) for _ in range(4000)]
w=lambda n:' '.join(random.choice(vocab) for _ in range(n))
blocks=[{'id':f'b{i}','kind':'action','runs':[{'text':w(60),'prov':'ai_generated','gen':'g1'}]} for i in range(420)]
print('doc json KB', len(json.dumps(blocks))//1024)
k.execute("drop table if exists w.docspike"); k.execute("create table w.docspike(seq int primary key, body jsonb not null)")
for s in range(300):
    b=random.randrange(len(blocks)); blocks[b]['runs'].append({'text':w(30),'prov':'creator'}) if s%3==0 else blocks[b]['runs'].__setitem__(0,{'text':w(60),'prov':'ai_edited','gen':f'g{s}'})
    k.execute("insert into w.docspike values (%s,%s)",(s,json.dumps(blocks)))
c.commit()
k.execute("select pg_size_pretty(pg_total_relation_size('w.docspike')), pg_total_relation_size('w.docspike')/300")
print('300 full snapshots stored (default pglz TOAST):', k.fetchone())
k.execute("select pg_size_pretty(sum(pg_column_size(body))) from w.docspike"); print('compressed column bytes', k.fetchone())
