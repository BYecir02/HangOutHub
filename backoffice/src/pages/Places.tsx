import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { apiDelete, apiGet } from '../lib/api';
import Pagination from '../components/Pagination';
import PageHeader from '../components/PageHeader';
import FilterBar from '../components/FilterBar';
import SectionCard from '../components/SectionCard';
import SectionTitle from '../components/SectionTitle';
import DataTable from '../components/DataTable';
import SelectField from '../components/SelectField';
import SearchInput from '../components/SearchInput';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import TableRowActions from '../components/TableRowActions';
import StatusBadge from '../components/StatusBadge';

interface CityOption {
  id: number;
  name: string;
  country: string;
}

interface PlaceItem {
  id: string;
  name: string;
  category?: string | null;
  description?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  priceLevel?: number | null;
  moderationStatus?: string | null;
  externalProvider?: string | null;
  providerMatchConfidence?: number | null;
  updatedAt?: string | null;
  City?: CityOption | null;
  PlaceTag?: {
    Tag?: {
      name?: string | null;
      Category?: {
        name?: string | null;
      } | null;
    } | null;
  }[];
}

function resolveCategories(place: PlaceItem) {
  const categories = [
    place.category?.trim(),
    ...(place.PlaceTag || [])
      .map((entry) => entry.Tag?.Category?.name?.trim())
      .filter((value): value is string => Boolean(value)),
  ]
    .filter((value): value is string => Boolean(value));

  return Array.from(new Set(categories));
}

export default function PlacesPage() {
  const navigate = useNavigate();
  const [places, setPlaces] = useState<PlaceItem[]>([]);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState<number | 'all'>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'name_asc' | 'name_desc' | 'city_asc'>('name_asc');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [deletingPlaceId, setDeletingPlaceId] = useState<string | null>(null);
  const pageSize = 10;

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const [placeData, cityData] = await Promise.all([
          apiGet<PlaceItem[]>('/places'),
          apiGet<CityOption[]>('/cities'),
        ]);

        if (!isMounted) {
          return;
        }

        setPlaces(placeData);
        setCities(cityData);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  const countryOptions = useMemo(() => {
    const countries = Array.from(
      new Set(cities.map((city) => city.country).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b));

    return countries;
  }, [cities]);

  const categoryOptions = useMemo(() => {
    const categories = Array.from(
      new Set(
        places
          .flatMap((place) => [
            place.category?.trim(),
            ...(place.PlaceTag || [])
              .map((entry) => entry.Tag?.Category?.name?.trim())
              .filter((value): value is string => Boolean(value)),
          ])
          .filter((value): value is string => Boolean(value)),
      ),
    ).sort((a, b) => a.localeCompare(b));

    return categories;
  }, [places]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = places.filter((place) => {
      if (query && !place.name.toLowerCase().includes(query)) {
        return false;
      }

      if (cityFilter !== 'all') {
        if (place.City?.id !== cityFilter) {
          return false;
        }
      }

      if (countryFilter !== 'all') {
        if ((place.City?.country || '').toLowerCase() !== countryFilter.toLowerCase()) {
          return false;
        }
      }

      if (categoryFilter !== 'all') {
        const placeCategories = [
          place.category,
          ...(place.PlaceTag || [])
            .map((entry) => entry.Tag?.Category?.name)
            .filter((value): value is string => Boolean(value)),
        ]
          .filter((value): value is string => Boolean(value))
          .map((value) => value.toLowerCase());

        if (!placeCategories.includes(categoryFilter.toLowerCase())) {
          return false;
        }
      }

      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortOrder === 'name_desc') {
        return b.name.localeCompare(a.name);
      }
      if (sortOrder === 'city_asc') {
        return (a.City?.name || '').localeCompare(b.City?.name || '');
      }
      return a.name.localeCompare(b.name);
    });
  }, [places, search, cityFilter, countryFilter, categoryFilter, sortOrder]);

  useEffect(() => {
    setPage(1);
  }, [search, cityFilter, countryFilter, categoryFilter, sortOrder]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [filtered.length, page, pageSize]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);


  const resolveTags = (place: PlaceItem) => {
    const tags =
      place.PlaceTag?.map((entry) => entry.Tag?.name).filter(Boolean) || [];
    return tags.join(', ');
  };

  const formatUpdatedAt = (value?: string | null) => {
    if (!value) {
      return '-';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  };

    const formatProviderSource = (value?: string | null) => {
      const normalized = (value || '').toUpperCase();
      if (normalized === 'GOOGLE') {
        return 'Google Maps';
      }
      if (normalized === 'APPLE') {
        return 'Apple Maps';
      }
      if (normalized === 'OTHER') {
        return 'Autre';
      }
      return normalized || '-';
    };

  const handleDelete = async (place: PlaceItem) => {
    const confirmed = window.confirm(
      `Supprimer le lieu "${place.name}" ? Cette action est irreversible.`,
    );
    if (!confirmed) {
      return;
    }

    setDeletingPlaceId(place.id);
    try {
      await apiDelete(`/places/${place.id}`);
      setPlaces((current) => current.filter((item) => item.id !== place.id));
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : 'Impossible de supprimer le lieu.',
      );
    } finally {
      setDeletingPlaceId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Gestion"
        title="Lieux"
        subtitle="Edite les informations essentielles des lieux."
        actions={
          <>
            <button
              onClick={() => navigate('/places/new')}
              className="rounded-xl border border-brand-200 bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600"
            >
              Ajouter un lieu
            </button>
            <FilterBar>
              <SelectField
                value={cityFilter}
                onChange={(value) =>
                  setCityFilter(value === 'all' ? 'all' : Number(value))
                }
                options={[
                  { label: 'Toutes les villes', value: 'all' },
                  ...cities.map((city) => ({ label: city.name, value: city.id })),
                ]}
              />
              <SelectField
                value={countryFilter}
                onChange={setCountryFilter}
                options={[
                  { label: 'Tous les pays', value: 'all' },
                  ...countryOptions.map((country) => ({
                    label: country,
                    value: country,
                  })),
                ]}
              />
              <SelectField
                value={categoryFilter}
                onChange={setCategoryFilter}
                options={[
                  { label: 'Toutes les categories', value: 'all' },
                  ...categoryOptions.map((category) => ({
                    label: category,
                    value: category,
                  })),
                ]}
              />
              <SelectField
                value={sortOrder}
                onChange={(value) =>
                  setSortOrder(value as 'name_asc' | 'name_desc' | 'city_asc')
                }
                options={[
                  { label: 'Nom A-Z', value: 'name_asc' },
                  { label: 'Nom Z-A', value: 'name_desc' },
                  { label: 'Ville A-Z', value: 'city_asc' },
                ]}
              />
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Rechercher un lieu..."
              />
            </FilterBar>
          </>
        }
      />

      <SectionCard>
        <SectionTitle subtitle="Liste des lieux disponibles." />
        {loading ? (
          <LoadingState />
        ) : (
          <>
            <DataTable
              columns={[
                { label: 'Lieu' },
                { label: 'Ville' },
                { label: 'Categories' },
                { label: 'Moderation' },
                { label: 'Derniere maj' },
                { label: 'Tags' },
                { label: 'Action', className: 'text-right' },
              ]}
            >
              <tbody className="text-slate-700">
                {paged.map((place) => (
                  <tr key={place.id} className="border-t border-slate-100">
                    <td className="py-4 font-semibold">{place.name}</td>
                    <td className="py-4">
                      {place.City?.name || '-'}
                    </td>
                    <td className="py-4 text-xs text-slate-500">
                      <div className="flex flex-wrap gap-1.5">
                        {resolveCategories(place).length > 0 ? (
                          resolveCategories(place).map((category) => (
                            <span
                              key={`${place.id}-${category}`}
                              className="rounded-full bg-brand-500/10 px-2.5 py-1 font-semibold text-brand-600"
                            >
                              {category}
                            </span>
                          ))
                        ) : (
                          <span>-</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="space-y-2">
                        <StatusBadge status={place.moderationStatus} />
                        <p className="text-xs text-slate-500">
                          {formatProviderSource(place.externalProvider)}
                          {place.providerMatchConfidence !== undefined &&
                          place.providerMatchConfidence !== null
                            ? ` · ${place.providerMatchConfidence.toFixed(2)}`
                            : ''}
                        </p>
                      </div>
                    </td>
                    <td className="py-4 text-xs text-slate-500">
                      {formatUpdatedAt(place.updatedAt)}
                    </td>
                    <td className="py-4 text-xs text-slate-500">
                      {resolveTags(place) || '-'}
                    </td>
                    <td className="py-4 text-right">
                      <TableRowActions>
                        <button
                          type="button"
                          onClick={() => navigate(`/places/view/${place.id}`)}
                          className="rounded-lg border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                        >
                          Voir la fiche
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/places/${place.id}`)}
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/places/new?duplicateFrom=${place.id}`)
                          }
                          className="rounded-lg border border-brand-200 px-3 py-2 text-xs font-semibold text-brand-600 hover:bg-brand-50"
                        >
                          Dupliquer
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(place)}
                          disabled={deletingPlaceId === place.id}
                          className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                        >
                          {deletingPlaceId === place.id ? 'Suppression...' : 'Supprimer'}
                        </button>
                      </TableRowActions>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState title="Aucun lieu trouve." />
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </DataTable>
            <Pagination
              currentPage={page}
              pageSize={pageSize}
              totalItems={filtered.length}
              onPageChange={setPage}
            />
          </>
        )}
      </SectionCard>

    </div>
  );
}

