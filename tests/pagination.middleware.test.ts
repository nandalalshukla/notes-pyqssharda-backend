import assert from "node:assert/strict";
import test from "node:test";
import type { Request, Response, NextFunction } from "express";
import { clampPagination } from "../src/middlewares/security/pagination.middleware.js";
import { listForUser, type ResourceConfig } from "../src/services/resource/resource.service.js";
import type { BaseResourceFields } from "../src/models/resource/resourceSchema.js";
import { mergeResourcePage } from "../src/services/resource/mergeResourcePages.js";

function resourceConfig(seed: {
  docs?: unknown[];
  total?: number;
  statusRows?: Array<{ _id: "pending" | "approved" | "rejected"; n: number }>;
}) {
  const calls: Record<string, unknown> = {};
  const query = {
    select(value: string) { calls.projection = value; return this; },
    sort(value: unknown) { calls.sort = value; return this; },
    skip(value: number) { calls.skip = value; return this; },
    limit(value: number) { calls.limit = value; return this; },
    lean: async () => seed.docs ?? [],
  };
  const model = {
    find(filter: unknown) { calls.filter = filter; return query; },
    countDocuments: async (filter: unknown) => { calls.countFilter = filter; return seed.total ?? 0; },
    aggregate: async () => seed.statusRows ?? [],
  };
  const config = { model } as unknown as ResourceConfig<BaseResourceFields>;
  return { config, calls };
}

function run(query: Record<string, unknown>, maxLimit = 50) {
  const request = { query } as unknown as Request;
  let called = false;
  const next: NextFunction = () => {
    called = true;
  };
  clampPagination({ maxLimit })(request, {} as Response, next);
  assert.equal(called, true);
  return request.query as Record<string, unknown>;
}

test("pagination applies defaults and clamps oversized values", () => {
  assert.deepEqual(run({}), { page: "1", limit: "25" });
  assert.deepEqual(run({ page: "2", limit: "500" }), {
    page: "2",
    limit: "50",
  });
});

test("pagination safely normalizes negative, fractional, and malformed values", () => {
  assert.deepEqual(run({ page: "-2", limit: "-10" }), {
    page: "1",
    limit: "25",
  });
  assert.deepEqual(run({ page: "1.5", limit: "2.5" }), {
    page: "1",
    limit: "25",
  });
  assert.deepEqual(run({ page: "NaN", limit: "Infinity" }), {
    page: "1",
    limit: "25",
  });
});

test("pagination bounds offsets to a safe maximum", () => {
  const request = { query: { page: "4002", limit: "25" } } as unknown as Request;
  let error: unknown;
  clampPagination({ maxLimit: 50 })(request, {} as Response, (value) => { error = value; });
  assert.equal(error instanceof Error, true);
  assert.equal((error as { statusCode?: number }).statusCode, 400);
});

test("owner resource pages use the exact owner filter and bounded page query", async () => {
  const { config, calls } = resourceConfig({
    docs: [{ _id: "page-two" }],
    total: 31,
    statusRows: [{ _id: "pending", n: 31 }],
  });
  const result = await listForUser(config, "507f1f77bcf86cd799439011", {
    page: 2,
    limit: 500,
    status: "pending",
    query: "database",
  });

  assert.deepEqual(calls.filter, {
    userId: "507f1f77bcf86cd799439011",
    status: "pending",
    $or: [
      { title: /database/i },
      { courseName: /database/i },
      { courseCode: /database/i },
    ],
  });
  assert.equal(calls.skip, 50);
  assert.equal(calls.limit, 50);
  assert.match(String(calls.projection), /fileUrl/);
  assert.match(String(calls.projection), /rejectionReason/);
  assert.deepEqual(calls.countFilter, calls.filter);
  assert.equal(result.pagination.total, 31);
  assert.equal(result.pagination.hasMore, false);
  assert.deepEqual(result.counts, { pending: 31, approved: 0, rejected: 0, all: 31 });
});

test("owner resource service keeps empty results as a valid paginated response", async () => {
  const { config } = resourceConfig({ docs: [], total: 0, statusRows: [] });
  const result = await listForUser(config, "507f1f77bcf86cd799439011", { page: 1, limit: 25 });
  assert.deepEqual(result.docs, []);
  assert.deepEqual(result.pagination, {
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0,
    hasMore: false,
  });
  assert.deepEqual(result.counts, { pending: 0, approved: 0, rejected: 0, all: 0 });
});

test("combined resource pages use global order and stable cross-type ties", () => {
  const notes = [
    { _id: "n2", resourceType: "note", createdAt: new Date("2025-01-02") },
    { _id: "n1", resourceType: "note", createdAt: new Date("2025-01-01") },
  ];
  const pyqs = [
    { _id: "p1", resourceType: "pyq", createdAt: new Date("2025-01-02") },
    { _id: "p2", resourceType: "pyq", createdAt: new Date("2025-01-03") },
  ];
  const syllabuses = [
    { _id: "s1", resourceType: "syllabus", createdAt: new Date("2025-01-02") },
  ];

  const secondPage = mergeResourcePage([notes, pyqs, syllabuses], 2, 2, "createdAt", -1);
  assert.deepEqual(secondPage.map((row) => row._id), ["p1", "s1"]);
  const ascendingPage = mergeResourcePage([notes, pyqs, syllabuses], 1, 2, "createdAt", 1);
  assert.deepEqual(ascendingPage.map((row) => row._id), ["n1", "n2"]);
});
