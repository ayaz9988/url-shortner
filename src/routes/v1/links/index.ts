import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { AuthenticatedRequest } from "../../../lib/auth/middleware";
import { shortenerScheme, ShortenerScheme } from "../../../services/validation/shortener";
import { ShortenerService } from "../../../services/urls/shortener.service";
import { authenticateToken } from "../../../lib/auth/middleware";

export async function links(fastify: FastifyInstance) {
    fastify.post('/shortner', { preHandler: authenticateToken(shortenerScheme) }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
        try {
            const validatedData = shortenerScheme.parse(request.body);
            const url = validatedData.url;

            const shortenerService = new ShortenerService();
            const result = await shortenerService.createShortUrl(url, request.user!.id);
    
            reply.status(201).send({
                shortCode: result.shortCode,
                originalUrl: url,
            });
        } catch (e: unknown) {
            if (e instanceof Error) {
                if (e.message.includes('not found')) {
                    return reply.code(404).send({ error: e.message });
                }
                return reply.code(400).send({ error: e.message });
            }
            return reply.code(500).send({ error: 'Internal server error' });
        }
    });

    fastify.get("/:code", async (request: FastifyRequest<{ Params: { code: string } }>, reply: FastifyReply) => {
        try {
            const { code } = request.params;
            
            const shortenerService = new ShortenerService();
            const result = await shortenerService.getOriginalUrl(code);

            if (!result) {
                return reply.code(404).send({ error: 'URL not found' });
            }

            reply.status(301).send({
                originalUrl: result.originalUrl,
                shortCode: code,
            });
        } catch (e: unknown) {
            if (e instanceof Error) {
                if (e.message.includes('not found')) {
                    return reply.code(404).send({ error: e.message });
                }
                return reply.code(400).send({ error: e.message });
            }
            return reply.code(500).send({ error: 'Internal server error' });
        }
    });
}