import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { apiGet } from '../lib/api';

interface PostDetail {
  id: string;
  content?: string | null;
  images?: string[];
  createdAt?: string | null;
  postType?: string | null;
  visibility?: string | null;
  placeName?: string | null;
  cityName?: string | null;
  ambiance?: string | null;
  User?: {
    id: string;
    displayName?: string | null;
    username?: string | null;
    avatarUrl?: string | null;
  } | null;
  Event?: {
    id: string;
    title?: string | null;
  } | null;
  Place?: {
    id: string;
    name?: string | null;
    City?: { name?: string | null } | null;
  } | null;
  _count?: {
    likes?: number;
    comments?: number;
  };
}

export default function PostViewPage() {
  const { id } = useParams();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await apiGet<PostDetail>(`/posts/admin/${id}`);
        if (isMounted) {
          setPost(data);
        }
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
  }, [id]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">
          Post
        </p>
        <h2 className="mt-2 text-2xl font-bold text-slate-900">
          Details du contenu
        </h2>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-soft">
        {loading ? (
          <p className="text-sm text-slate-500">Chargement...</p>
        ) : post ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                  Auteur
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {post.User?.displayName ||
                    post.User?.username ||
                    'Utilisateur'}
                </p>
              </div>
              <div className="text-sm text-slate-500">
                {post.createdAt
                  ? new Date(post.createdAt).toLocaleString()
                  : '-'}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                Contenu
              </p>
              <p className="mt-2 text-base text-slate-700">
                {post.content || 'Aucun texte.'}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-100 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                  Type
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-700">
                  {post.postType || 'post'}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-100 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                  Visibilite
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-700">
                  {post.visibility || 'public'}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-100 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                  Interactions
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-700">
                  {post._count?.likes || 0} likes · {post._count?.comments || 0}{' '}
                  commentaires
                </p>
              </div>
            </div>

            {(post.Event || post.Place || post.placeName) && (
              <div className="rounded-2xl border border-slate-100 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                  Contexte
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-700">
                  {post.Event?.title ||
                    post.Place?.name ||
                    post.placeName ||
                    '-'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {post.Place?.City?.name || post.cityName || ''}
                </p>
              </div>
            )}

            {post.images && post.images.length > 0 ? (
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                  Images
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {post.images.map((url, index) => (
                    <div
                      key={`${post.id}-image-${index}`}
                      className="overflow-hidden rounded-2xl border border-slate-100"
                    >
                      <img
                        src={url}
                        alt={`Post ${index + 1}`}
                        className="h-40 w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Post introuvable.</p>
        )}
      </div>
    </div>
  );
}
