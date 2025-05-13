import { type AnyRoute, useParams } from '@tanstack/react-router';

// --------------------------------------------------------------------------------
// tanstack router - generic search params
export interface SearchParams {
	search: string | undefined
}
export const validateSearch = (search: SearchParams): SearchParams => ({ search: search.search || undefined });
export const getIDBSearchQuery = (search: SearchParams) => `%${search.search || ''}%`;
export const getIDBSearchQueryForField = (search: SearchParams, field: string) => {
	if (!search.search) return {};
	return { [field]: { $ilike: `%${search.search || ''}%` } };
};

// --------------------------------------------------------------------------------
// tanstack router - route id
export const useRouteId = () => {
	const params = useParams({ strict: false }) as { id: string };
	return params.id;
};
