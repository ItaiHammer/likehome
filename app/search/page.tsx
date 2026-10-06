import { SearchRequest } from './types';
import { search } from './search';

interface SearchProps {
    searchParams: Promise<SearchRequest>;
}

export default async function Page({ searchParams }: SearchProps) {
    const resolvedParams = await searchParams;
    const results = await search(resolvedParams);

    // TODO(Frontend): Implement results page
    return (
        <pre>{JSON.stringify(results, null, 2)}</pre>
    );
}