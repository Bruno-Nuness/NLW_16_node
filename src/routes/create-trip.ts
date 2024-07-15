import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import dayjs from "dayjs";
import { prisma } from "../lib/prisma";
import { getMailClient } from "../lib/mail";

export async function createTrip(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    "/trips",
    {
      schema: {
        body: z.object({
          destination: z.string().min(4),
          starts_at: z.coerce.date(),
          ends_at: z.coerce.date(),
          owner_name: z.string(),
          owner_email: z.string().email(),
          emails_to_invite: z.array(z.string().email())
        }),
      },
    },
    async (request) => {
      const { destination, ends_at, starts_at, owner_name, owner_email } =
        request.body;

      if (dayjs(starts_at).isBefore(new Date())) {
        throw new Error("Invalid trip start date.");
      }

      if (dayjs(ends_at).isBefore(starts_at)) {
        throw new Error("Invalid trip end date.");
      }

      const trip = await prisma.trip.create({
        data: {
          destination,
          starts_at,
          ends_at,
          participants: {
            create: {
              name: owner_name,
              email: owner_email,
              is_owner:true,
              is_corfirmed:true
            },
          },
        },
      });

      await prisma.participant.create({
        data: {
          name: owner_name,
          email: owner_email,
          trip_id: trip.id,
        },
      });

      const email = await getMailClient();

      const mail = await email.sendMail({
        from: {
          name: "Equipe planner",
          address: "planner@planner",
        },
        to: {
          name: owner_name,
          address: owner_email,
        },
        subject: "Testando envio de e-mail",
        html: `<p>Teste de envio de e-mail</p>`,
      });

      console.log(mail);

      return { Id: trip.id };
    }
  );
}
