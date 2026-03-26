import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { apiGet } from '../lib/api';
import Pagination from '../components/Pagination';

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
  PlaceTag?: Array<{
    Tag?: {
      name?: string | null;
    } | null;
  }>;
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
      <div className="rounded-2xl bg-white p-6 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">
              Gestion
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">
              Lieux
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Edite les informations essentielles des lieux.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={cityFilter}
              onChange={(event) =>
                setCityFilter(
                  event.target.value === 'all' ? 'all' : Number(event.target.value),
                )
              }
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
            >
              <option value="all">Toutes les villes</option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}
                </option>
              ))}
            </select>
            <select
              value={sortOrder}
              onChange={(event) =>
                setSortOrder(
                  event.target.value as 'name_asc' | 'name_desc' | 'city_asc',
                )
              }
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
            >
              <option value="name_asc">Nom A-Z</option>
              <option value="name_desc">Nom Z-A</option>
              <option value="city_asc">Ville A-Z</option>
            </select>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher un lieu..."
              className="w-64 rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-soft">
        {loading ? (
          <p className="text-sm text-slate-500">Chargement...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-400">
                <tr>
                  <th className="pb-3">Lieu</th>
                  <th className="pb-3">Ville</th>
                  <th className="pb-3">Tags</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="text-slate-700">
                {paged.map((place) => (
                  <tr key={place.id} className="border-t border-slate-100">
                    <td className="py-4 font-semibold">{place.name}</td>
                    <td className="py-4">
                      {place.City?.name || '—'}
                    </td>
                    <td className="py-4 text-xs text-slate-500">
                      {resolveTags(place) || '-'}
                    </td>
                    <td className="py-4 text-right">
                      <button
                        onClick={() => navigate(`/places/${place.id}`)}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        Modifier
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">
                      Aucun lieu trouve.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
            <Pagination
              currentPage={page}
              pageSize={pageSize}
              totalItems={filtered.length}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

    </div>
  );
}
