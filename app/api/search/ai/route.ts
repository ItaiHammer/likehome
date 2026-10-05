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

    Use the following format for the 'where' output field:
        Write as comma and space separated string in order of preference based on information from given input:
        1. 'city, region, country' if all 3 specified or unambiguous in given input
        2. 'city, country' if both specified or unambiguous in given input
        3. 'country' if unambigious in given input
    
    Use the following format for the 'text' output field:
        If any field in output besides text has a value, then the text output field must have a value describing all values in output.
        The only instance where text is not defined is if all other output fields have been omitted.
        Using the other output fields with values from the given input, format it into the following paragraph format.
        If a field is missing, omit the sentence segment mentioning that field from the text output. 
        Do not assume the value of a field omitted from output.
        Correct grammar relating to units after numbers or removed parts of a sentence due to a missing field,
        but follow the paragraph format template as closely as possible. 
        In the paragraph format template, replace the single quotations and the name of the output field with the value of the output field.

        Paragraph format:
        Based on your description, the following travel accommodations would suit your plans best.
        They are all located in 'where' and available from 'checkIn' to 'checkOut'.
        The accommodations have at least 'numBeds' 'bedSize' beds, perfect for 'adults' adults and 'children' children.
        The price per night is between 'minPrice' and 'maxPrice'.
        These options have been rated at least 'minRating' out of 5 stars.
        These accommodations have 'all elements in tags output field'.
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
        numBeds: getOptionalNumberToString(0, undefined, true),
        bedSize: getOptionalEnum(bedSizes),
        adults: getOptionalNumberToString(0, undefined, true),
        children: getOptionalNumberToString(0, undefined, true),
        minPrice:getOptionalNumberToString(0, undefined, false),
        maxPrice: getOptionalNumberToString(0, undefined, false),
        minRating: getOptionalNumberToString(0, 5, false),
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

function getOptionalNumberToString(min?: number, max?: number, int?: boolean) {
    let value = z.number();
    if (int) {
        value = value.int();
    }
    if (min !== undefined) {
        value = value.min(min);
    }
    if (max !== undefined) {
        value = value.max(max);
    }
    return value.transform((val) => val.toString(0)).optional();
}

function getOptionalEnum(options: readonly any[]) {
    return z.enum(options).optional();
}