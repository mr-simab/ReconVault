import admin from "firebase-admin";
import { env } from "../config/env";

type Direction = "asc" | "desc";
type QueryOptions = {
  where?: Record<string, any>;
  skip?: number;
  take?: number;
  orderBy?: Record<string, Direction>;
};

type WriteOptions = {
  data: Record<string, any>;
};

type UpdateOptions = {
  where: { id?: string | number; taskId?: string };
  data: Record<string, any>;
};

type DeleteOptions = {
  where: { id: string | number };
};

const collectionNames = {
  targets: "targets",
  entities: "entities",
  relationships: "relationships",
  collections: "collections",
  investigations: "investigations",
  investigationPlans: "investigationPlans",
  evidence: "evidence",
  toolExecutions: "toolExecutions",
  cases: "cases",
  timeline: "timeline",
  iocs: "iocs",
  auditLogs: "auditLogs",
  users: "users",
  roles: "roles",
  queueJobs: "queueJobs"
};

function normalizePrivateKey(key: string): string {
  return key.replace(/\\n/g, "\n");
}

function sanitizeForFirebase(value: any): any {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) return value.toString("base64");
  if (Array.isArray(value)) return value.map((item) => {
    const sanitized = sanitizeForFirebase(item);
    return sanitized === undefined ? null : sanitized;
  });
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, nested]) => [key, sanitizeForFirebase(nested)])
        .filter(([, nested]) => nested !== undefined)
    );
  }
  return value;
}

function getComparable(value: any): any {
  if (typeof value === "string") {
    const timestamp = Date.parse(value);
    if (!Number.isNaN(timestamp)) return timestamp;
  }
  return value;
}

function matchesWhere(item: Record<string, any>, where: Record<string, any> = {}): boolean {
  return Object.entries(where).every(([field, expected]) => {
    if (expected === undefined) return true;
    const actual = item[field];

    if (expected && typeof expected === "object" && "contains" in expected) {
      const needle = String(expected.contains || "");
      const haystack = String(actual || "");
      return expected.mode === "insensitive"
        ? haystack.toLowerCase().includes(needle.toLowerCase())
        : haystack.includes(needle);
    }

    return String(actual) === String(expected);
  });
}

class FirebaseDataStore {
  private database: admin.database.Database | null = null;

  readonly target = this.createModel(collectionNames.targets);
  readonly entity = this.createModel(collectionNames.entities);
  readonly relationship = this.createModel(collectionNames.relationships);
  readonly investigation = this.createModel(collectionNames.investigations);
  readonly investigationPlan = this.createModel(collectionNames.investigationPlans);
  readonly evidence = this.createModel(collectionNames.evidence);
  readonly toolExecution = this.createModel(collectionNames.toolExecutions);
  readonly case = this.createModel(collectionNames.cases);
  readonly timeline = this.createModel(collectionNames.timeline);
  readonly ioc = this.createModel(collectionNames.iocs);
  readonly auditLog = this.createModel(collectionNames.auditLogs);
  readonly user = this.createModel(collectionNames.users);
  readonly role = this.createModel(collectionNames.roles);
  readonly queueJob = this.createModel(collectionNames.queueJobs);
  readonly collection = {
    ...this.createModel(collectionNames.collections),
    findUnique: async ({ where }: { where: { id?: string | number; taskId?: string } }) => {
      if (where.taskId) {
        const rows = await this.findMany(collectionNames.collections, { where: { taskId: where.taskId }, take: 1 });
        return rows[0] || null;
      }
      if (where.id) return this.findUnique(collectionNames.collections, { where: { id: where.id } });
      return null;
    },
    update: async ({ where, data }: UpdateOptions) => {
      if (where.taskId) {
        const existing = await this.collection.findUnique({ where: { taskId: where.taskId } });
        if (!existing) throw new Error(`Collection task not found: ${where.taskId}`);
        return this.update(collectionNames.collections, { where: { id: existing.id }, data });
      }
      return this.update(collectionNames.collections, { where, data });
    }
  };

  get configured(): boolean {
    return Boolean(env.firebaseDatabaseUrl);
  }

  async connect(): Promise<void> {
    await this.ping();
  }

  async disconnect(): Promise<void> {
    const app = admin.apps[0];
    if (app) await app.delete();
    this.database = null;
  }

  async ping(): Promise<void> {
    await this.db.ref(".info/serverTimeOffset").once("value");
  }

  private get db(): admin.database.Database {
    if (!env.firebaseDatabaseUrl) {
      throw new Error("Firebase Realtime Database is not configured. Set FIREBASE_DATABASE_URL.");
    }

    if (this.database) return this.database;

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: this.resolveCredential(),
        databaseURL: env.firebaseDatabaseUrl
      });
    }

    this.database = admin.database();
    return this.database;
  }

  private resolveCredential(): admin.credential.Credential {
    if (env.firebaseServiceAccountJson) {
      const parsed = JSON.parse(env.firebaseServiceAccountJson);
      if (parsed.private_key) parsed.private_key = normalizePrivateKey(parsed.private_key);
      return admin.credential.cert(parsed);
    }

    if (env.firebaseProjectId && env.firebaseClientEmail && env.firebasePrivateKey) {
      return admin.credential.cert({
        projectId: env.firebaseProjectId,
        clientEmail: env.firebaseClientEmail,
        privateKey: normalizePrivateKey(env.firebasePrivateKey)
      });
    }

    return admin.credential.applicationDefault();
  }

  private createModel(collection: string) {
    return {
      findMany: (options: QueryOptions = {}) => this.findMany(collection, options),
      count: (options: { where?: Record<string, any> } = {}) => this.count(collection, options.where),
      findUnique: ({ where }: { where: { id?: string | number; name?: string } }) => this.findUnique(collection, { where }),
      create: (options: WriteOptions) => this.create(collection, options),
      update: (options: UpdateOptions) => this.update(collection, options),
      delete: (options: DeleteOptions) => this.delete(collection, options)
    };
  }

  private async nextId(collection: string): Promise<number> {
    const result = await this.db.ref(`_counters/${collection}`).transaction((current) => Number(current || 0) + 1);
    return Number(result.snapshot.val());
  }

  private async readAll(collection: string): Promise<Record<string, any>[]> {
    const snapshot = await this.db.ref(collection).once("value");
    const value = snapshot.val() || {};
    return Object.values(value);
  }

  private async findMany(collection: string, options: QueryOptions = {}): Promise<Record<string, any>[]> {
    const skip = Number(options.skip || 0);
    const take = options.take === undefined ? undefined : Number(options.take);
    let rows = (await this.readAll(collection)).filter((item) => matchesWhere(item, options.where));

    if (options.orderBy) {
      const [field, direction] = Object.entries(options.orderBy)[0];
      rows = rows.sort((a, b) => {
        const aValue = getComparable(a[field]);
        const bValue = getComparable(b[field]);
        if (aValue === bValue) return 0;
        const result = aValue > bValue ? 1 : -1;
        return direction === "desc" ? -result : result;
      });
    }

    return rows.slice(skip, take === undefined ? undefined : skip + take);
  }

  private async count(collection: string, where?: Record<string, any>): Promise<number> {
    return (await this.findMany(collection, { where })).length;
  }

  private async findUnique(collection: string, { where }: { where: { id?: string | number; name?: string } }) {
    if (where.id !== undefined) {
      const snapshot = await this.db.ref(`${collection}/${where.id}`).once("value");
      return snapshot.val() || null;
    }

    if (where.name !== undefined) {
      const rows = await this.findMany(collection, { where: { name: where.name }, take: 1 });
      return rows[0] || null;
    }

    return null;
  }

  private async create(collection: string, { data }: WriteOptions) {
    const id = await this.nextId(collection);
    const now = new Date().toISOString();
    const record = sanitizeForFirebase({
      id,
      ...data,
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now
    });
    await this.db.ref(`${collection}/${id}`).set(record);
    return record;
  }

  private async update(collection: string, { where, data }: UpdateOptions) {
    const id = where.id;
    const existing = await this.findUnique(collection, { where: { id } });
    if (!existing) throw new Error(`${collection} record not found: ${id}`);
    const cleanData = sanitizeForFirebase(data) || {};

    const record = sanitizeForFirebase({
      ...existing,
      ...cleanData,
      id: existing.id,
      updatedAt: new Date().toISOString()
    });

    await this.db.ref(`${collection}/${id}`).set(record);
    return record;
  }

  private async delete(collection: string, { where }: DeleteOptions) {
    await this.db.ref(`${collection}/${where.id}`).remove();
    return { id: where.id };
  }
}

export const dataStore = new FirebaseDataStore();
