import { streamText, Output, convertToModelMessages, createUIMessageStreamResponse, toUIMessageStream } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { bedSizes, sorts, tags } from '../../../search/types';

export async function POST(req: Request) {
    const { messages } = await req.json();

    const textStream = streamText({
        model: google('gemini-3.1-flash-lite'),
        instructions: instructions,
        messages: await convertToModelMessages(messages),
        temperature: 0,
        output: aiOutputFormat
    });
    
    return createUIMessageStreamResponse({
        stream: toUIMessageStream({ stream: textStream.stream }),
    });
}

const helpMessage = 'Provide a description of your planned trip, and I will find the best accommodations for it.'
const outOfScopeMessage = `Please let me know if you require any assistance for travel accommodations. ${helpMessage}`;

const instructions = 
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

        'minPrice' and 'maxPrice:
            - Units are price per night.
            - Accurately calculate the equivalent price per night if given input provides in another unit.
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

function getOptionalEnum(options: readonly any[]) {
    return z.enum(options).optional();
}