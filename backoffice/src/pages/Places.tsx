import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { apiGet } from '../lib/api';
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

interface CityOption {
  id: number;
  name: string;
  country: string;
}

interface PlaceItem {
  id: string;
  name: string;
  description?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  priceLevel?: number | null;
  City?: CityOption | null;
  PlaceTag?: {
    Tag?: {
      name?: string | null;
    } | null;
  }[];
}

export default function PlacesPage() {
  const navigate = useNavigate();
  const [places, setPlaces] = useState<PlaceItem[]>([]);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState<number | 'all'>('all');
  const [sortOrder, setSortOrder] = useState<'name_asc' | 'name_desc' | 'city_asc'>('name_asc');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
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

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = places.filter((place) => {
      if (query && !place.name.toLowerCase().includes(query)) {
        return false;
      }

      if (cityFilter !== 'all') {
        return place.City?.id === cityFilter;
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
  }, [places, search, cityFilter, sortOrder]);

  useEffect(() => {
    setPage(1);
  }, [search, cityFilter, sortOrder]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);


  const resolveTags = (place: PlaceItem) => {
    const tags =
      place.PlaceTag?.map((entry) => entry.Tag?.name).filter(Boolean) || [];
    return tags.join(', ');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Gestion"
        title="Lieux"
        subtitle="Edite les informations essentielles des lieux."
        actions={
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
        }
      />

      <SectionCard>
        <SectionTitle label="Lieux" subtitle="Liste des lieux disponibles." />
        {loading ? (
          <LoadingState />
        ) : (
          <>
            <DataTable
              columns={[
                { label: 'Lieu' },
                { label: 'Ville' },
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
                      {resolveTags(place) || '-'}
                    </td>
                    <td className="py-4 text-right">
                      <TableRowActions>
                        <button
                          onClick={() => navigate(`/places/${place.id}`)}
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          Modifier
                        </button>
                      </TableRowActions>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
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

