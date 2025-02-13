import { type AnyRoute, useParams } from '@tanstack/react-router';

// --------------------------------------------------------------------------------
// tanstack router - generic search params
export interface SearchParams {
	search: string | undefined
}
export const validateSearch = (search: SearchParams): SearchParams => ({ search: search.search || undefined });

// --------------------------------------------------------------------------------
// tanstack router - route id
export const useRouteId = () => {
	const params = useParams({ strict: false }) as { id: string };
	return params.id;
};
