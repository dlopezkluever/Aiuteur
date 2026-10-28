import { describeHistoryConformance, describeStoreConformance, fakeStoreSubject } from "@aiuteur/testing";

describeStoreConformance("in-memory, virtual time", fakeStoreSubject);
describeHistoryConformance("in-memory, virtual time", fakeStoreSubject);
