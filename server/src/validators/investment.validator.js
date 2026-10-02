import { z } from "zod";

const objectIdString = z.string().trim().min(1).max(40);

const marketSearchSchema = z.object({
  query: z.object({
    query: z.string().trim().min(2, "Enter at least 2 characters").max(50),
    page: z.coerce.number().int().min(1).max(1000).default(1),
    records: z.coerce.number().int().min(1).max(30).default(20),
  }),
});

const tradeSchema = z.object({
  body: z.object({
    accountId: objectIdString,
    instrumentId: objectIdString,
    type: z.enum(["BUY", "SELL"]),
    quantity: z.number().finite().positive().max(1_000_000_000),
    price: z.number().finite().positive().max(1_000_000_000),
    fees: z.number().finite().min(0).max(100_000_000).default(0),
    tradeDate: z.string().trim().min(1).max(30),
    note: z.string().trim().max(300).default(""),
  }),
});

const tradeListSchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
  }),
});

const watchlistCreateSchema = z.object({
  body: z.object({ instrumentId: objectIdString }),
});

const watchlistIdSchema = z.object({
  params: z.object({ watchlistId: objectIdString }),
});

const instrumentIdSchema = z.object({
  params: z.object({ instrumentId: objectIdString }),
});

const historySchema = z.object({
  params: z.object({ instrumentId: objectIdString }),
  query: z.object({ period: z.enum(["1D", "5D", "1M", "3M", "6M", "1Y"]).default("1M") }),
});

export {
  historySchema,
  instrumentIdSchema,
  marketSearchSchema,
  tradeListSchema,
  tradeSchema,
  watchlistCreateSchema,
  watchlistIdSchema,
};
