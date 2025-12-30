import z from "zod";
import { env } from "../../config";

export const shortenerScheme = z.object({
    url: z.httpUrl().max(env.maxUrlLength, { message: "URL too long" }),
});

export type ShortenerScheme = z.infer<typeof shortenerScheme>