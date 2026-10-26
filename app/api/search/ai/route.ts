import { streamText, Output, convertToModelMessages, createUIMessageStreamResponse, toUIMessageStream, type UIMessage } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { bedSizes, sorts, tags } from '../../../search/types';
import { todayInTimeZone } from '@/utils/reservation-logic';

export async function POST(req: Request) {
    // Malformed input is the caller's mistake: answer 400, not an unhandled 500
    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }
    const { messages, tz } = (body ?? {}) as { messages?: unknown; tz?: unknown };
    if (!Array.isArray(messages) || messages.length === 0) {
        return Response.json({ error: 'messages must be a non-empty array.' }, { status: 400 });
    }

    let modelMessages;
    try {
        modelMessages = await convertToModelMessages(messages as UIMessage[]);
    } catch {
        return Response.json({ error: 'messages are not in the expected chat format.' }, { status: 400 });
    }

    const textStream = streamText({
        model: google('gemini-3.1-flash-lite'),
        // Built per request so "today" is never stale on a long-running server
        instructions: getInstructions(todayInTimeZone(tz)),
        messages: modelMessages,
        temperature: 0,
        output: aiOutputFormat
    });
    
    return createUIMessageStreamResponse({
        stream: toUIMessageStream({ stream: textStream.stream }),
    });
}

const helpMessage = 'Provide a description of your planned trip, and I will find the best accommodations for it.'
const outOfScopeMessage = `Please let me know if you require any assistance for travel accommodations. ${helpMessage}`;

// A function, not a const: a module-level const is built once when the server starts,
// so the date inside it would stay frozen at that day.
const getInstructions = (today: string) =>
    `You are a professional travel accommodations assistant. 

    If the given input does not relate to travel accommodations, then return the following text:
    ${outOfScopeMessage}
    and omit the rest of the output fields.

    If the given input asks what can be asked, then return the following text:
    ${helpMessage}
    and omit the rest of the output fields.

    Otherwise, extract information from the given input into the output format.
    Omit output field if information for that field is not provided by the given input. Do not assume.
    Include value for output field if the given input specifies a value for that field.

    For the tags output field, only include values when the given input explicitly seeks out accommodations with the benefits.
    Do not just include all tags, unless the given input does actually want all of the tags. Do not assume.

    The following are format rules for certain output fields. Always use given input for the information, and do NOT assume.
        'where':
            - 'city, region, country' (preferred if all 3 specified or unambiguous).
            - Fallback 1: 'city, country' (if region is missing or ambiguous).
            - Fallback 2: 'city' (if only city is specified or unambiguous).
            - If no valid city can be determined, output nothing (leave blank).
            - Spell out all names fully. NO abbreviations (e.g., use "California", not "CA"; use "United States of America", not "US" or "USA").

        'checkIn' and 'checkOut':
            - Must be on or after today's date (${today}).
            - Include both xor none. Never include one but not the other.
            - If checkIn and checkOut are both undefined, omit these fields from output.
            - Otherwise, handle the following cases IN ORDER:
            1. If checkIn is defined but checkOut is omitted, set checkOut to checkIn + 1 day.
            2. If checkOut is defined but checkIn is omitted, set checkIn to checkOut - 1 day.
            3. If checkIn is before today's date, set checkIn to today's date.
            4. If checkIn is on or after checkOut, set checkOut to checkIn + 1 day.

        'minPrice' and 'maxPrice:
            - Units are price per night.
            - Accurately calculate the equivalent price per night if given input provides in another unit.
            - minPrice must be less than or equal to maxPrice. Swap minPrice and maxPrice to make this true if needed.
            - Include none, both, xor one or the other field.
            - Including 'minPrice' does not mean 'maxPrice' must be specified and vice versa.

        'text:
            - If any field in output besides text has a value, then the text output field must have a value describing all values in output.
            - The only instance where text is not defined is if all other output fields have been omitted.
            - Using the other output fields with values from the given input, format it into the following paragraph format.
            - If a field is missing, omit the sentence segment mentioning that field from the text output. 
            - Do not assume the value of a field omitted from output.
            - In the paragraph format template, replace the single quotations and the name of the output field with the value of the output field.
            - **CRITICAL**: Correct any incorrect grammar due to filling in output fields or removing parts of a sentence due to omitted output fields with the minimum edits to the provided paragraph format template.

        Paragraph format:
        Based on your description, the following travel accommodations would suit your plans best.
        They are all located in 'where' and available from 'checkIn in Month name, Day number, Year number' to 'checkOut in Month name, Day number, Year number'.
        The accommodations have at least 'numBeds' 'bedSize' beds.
        The accommodations are perfect for 'adults' adults and 'children' children.
        The price per night is between 'minPrice' and 'maxPrice'.
        These options have been rated at least 'minRating' out of 5 stars.
        These accommodations are great for 'tags in output field tags in: families, kids, pets, couples, friends'.
        These accommodations have 'tags in output field tags not included in previous sentence in lowercase when that is grammatically correct'.
        The results are sorted by 'sort'.
        Hope you find one where you can best enjoy your stay!
    `;

// Match SearchRequest
const aiOutputFormat = Output.object({
    schema: z.object({
        text: getOptionalZString(),
        where: getOptionalZString(),
        checkIn: getOptionalIsoDateToString(),
        checkOut: getOptionalIsoDateToString(),
        numBeds: getOptionalNumberToString(0, undefined),
        bedSize: getOptionalEnum(bedSizes),
        adults: getOptionalNumberToString(0, undefined),
        children: getOptionalNumberToString(0, undefined),
        minPrice:getOptionalNumberToString(0, undefined, 2),
        maxPrice: getOptionalNumberToString(0, undefined, 2),
        minRating: getOptionalNumberToString(0, 5, 1),
        sort: getOptionalEnum(sorts),
        tags: z.array(z.enum(tags)).optional()
    })
});

// Helper z functions

function getOptionalZString() {
    return z.string().optional();
}

function getOptionalIsoDateToString() {
    return z.iso.date().transform((val) => val.toString()).optional();
}

function getOptionalNumberToString(min?: number, max?: number, decimalDigits: number = 0) {
    let value = z.number();
    if (min !== undefined) {
        value = value.min(min);
    }
    if (max !== undefined) {
        value = value.max(max);
    }
    return value.transform((val) => val.toFixed(decimalDigits)).optional();
}

function getOptionalEnum<const T extends readonly [string, ...string[]]>(options: T) {
    return z.enum(options).optional();
}