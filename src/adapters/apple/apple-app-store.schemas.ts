import { z } from 'zod';

/** An in-app event, as App Store Connect answers a create, an update or a listing, every field it carries kept. */
export const AppleEventSchema = z.looseObject({
    attributes: z.looseObject({ eventState: z.string() }),
    id: z.string(),
});

/** The answer to an event created or updated. */
export const AppleEventResponseSchema = z.object({ data: AppleEventSchema });

/** The answer to a listing of the app's events. */
export const AppleEventListSchema = z.object({ data: z.array(AppleEventSchema) });

/** The answer to a resource created by its id alone — a localization. */
export const AppleCreatedSchema = z.object({ data: z.object({ id: z.string() }) });

const RequestHeaderSchema = z.object({ name: z.string(), value: z.string() });

const UploadOperationSchema = z.object({
    length: z.number(),
    method: z.string(),
    offset: z.number(),
    requestHeaders: z.array(RequestHeaderSchema),
    url: z.string(),
});

const ScreenshotAttributesSchema = z.object({
    uploadOperations: z.array(UploadOperationSchema),
});

/** The answer to a screenshot reserved: its id and the uploads its bytes owe. */
export const AppleScreenshotSchema = z.object({
    data: z.object({ attributes: ScreenshotAttributesSchema, id: z.string() }),
});

/** Reads App Store Connect's `answer` as `schema` describes it, refusing an answer of another shape with what it lacks. */
export function readAnswer<Schema extends z.ZodType>(
    schema: Schema,
    answer: unknown,
): z.output<Schema> {
    const read = schema.safeParse(answer);
    if (!read.success) {
        throw new Error(
            `App Store Connect answered an unexpected shape: ${z.prettifyError(read.error)}`,
        );
    }
    return read.data;
}
