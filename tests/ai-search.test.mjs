import { describe, test } from 'node:test';
import assert from 'node:assert';

const { readAiAnswer } = await import('../app/_components/aiSearch.ts');

describe('readAiAnswer', () => {
    test('turns the AI fields into the same link a normal search makes', () => {
        const answer = readAiAnswer(
            JSON.stringify({
                text: 'Based on your description...',
                where: 'Paris, France',
                checkIn: '2026-11-02',
                checkOut: '2026-11-06',
                adults: 2,
                maxPrice: 300,
                minRating: 4.5,
                tags: ['Pool', 'Washer & Dryer'],
            }),
            'paris for two with a pool under 300',
        );

        assert.strictEqual(answer.reply, 'Based on your description...');
        assert.deepStrictEqual(Object.fromEntries(answer.query), {
            where: 'Paris, France',
            checkIn: '2026-11-02',
            checkOut: '2026-11-06',
            adults: '2',
            maxPrice: '300',
            minRating: '4.5',
            tags: 'Washer & Dryer',
            aiPrompt: 'paris for two with a pool under 300',
            aiReply: 'Based on your description...',
        });
        assert.deepStrictEqual(answer.query.getAll('tags'), ['Pool', 'Washer & Dryer']);
        assert.match(answer.query.toString(), /tags=Washer\+%26\+Dryer/);
    });

    test('returns only the reply when the prompt was not about a stay', () => {
        const answer = readAiAnswer(JSON.stringify({ text: 'Please let me know if you require any assistance...' }), 'hi');
        assert.deepStrictEqual(answer, { reply: 'Please let me know if you require any assistance...', query: null });
    });

    test('accepts JSON wrapped in a code fence', () => {
        const answer = readAiAnswer('```json\n{"where":"Tokyo, Japan"}\n```', 'tokyo');
        assert.strictEqual(answer.query.get('where'), 'Tokyo, Japan');
    });

    test('ignores empty and unknown fields', () => {
        const answer = readAiAnswer(JSON.stringify({ where: '  ', adults: 3, hacker: 'x', tags: [1, 'Gym'] }), 'p');
        assert.deepStrictEqual([...answer.query.keys()], ['adults', 'tags', 'aiPrompt']);
        assert.deepStrictEqual(answer.query.getAll('tags'), ['Gym']);
    });

    test('returns null for an answer that is not a JSON object', () => {
        assert.strictEqual(readAiAnswer('not json', 'p'), null);
        assert.strictEqual(readAiAnswer('[1,2]', 'p'), null);
        assert.strictEqual(readAiAnswer('null', 'p'), null);
    });
});
