import { describeSchedulerConformance, fakeSchedulerSubject } from "@aiuteur/testing";

describeSchedulerConformance("in-memory, virtual time", fakeSchedulerSubject);
