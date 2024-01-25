import * as z from "zod";

export const PresenceMessageParser = z.object({
  userId: z.string(),
  message: z.string().optional(),
  position: z
    .object({
      x: z.number(),
      y: z.number(),
    })
    .optional(),
  requery: z.boolean().optional(),
});

export type PresenceMessage = z.infer<typeof PresenceMessageParser>;

export const SetImageParser = z.object({
  token: z.string(),
  image: z.instanceof(File),
});

export type SetImage = z.infer<typeof SetImageParser>;

export const RegistrationParser = z.object({
  username: z.string(),
});

export type Registration = z.infer<typeof RegistrationParser>;
