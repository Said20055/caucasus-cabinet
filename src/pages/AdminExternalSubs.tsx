import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  externalSubsApi,
  type ExternalSourceDetail,
  type ExternalSourceListItem,
} from '../api/externalSubs';

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-xs text-dark-400">—</span>;
  const ok = status === 'ok';
  return (
    <span
      className="rounded px-2 py-0.5 text-[11px] font-semibold"
      style={{
        background: ok ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)',
        color: ok ? '#34d399' : '#f87171',
      }}
    >
      {ok ? 'ok' : 'error'}
    </span>
  );
}

export default function AdminExternalSubs() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [interval, setIntervalMin] = useState<number | ''>(360);
  const [openId, setOpenId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['external-subs'],
    queryFn: () => externalSubsApi.list(),
  });

  const detailQuery = useQuery({
    queryKey: ['external-subs', openId],
    queryFn: () => externalSubsApi.get(openId as number),
    enabled: openId != null,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['external-subs'] });
  };

  const apiError = (e: unknown) =>
    setError(
      (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        (e as Error)?.message ||
        'Error',
    );

  const createMut = useMutation({
    mutationFn: () =>
      externalSubsApi.create({
        name,
        url,
        refresh_interval_minutes: interval === '' ? undefined : Number(interval),
      }),
    onSuccess: (src) => {
      setName('');
      setUrl('');
      setError(null);
      invalidate();
      setOpenId(src.id);
    },
    onError: apiError,
  });

  const refreshMut = useMutation({
    mutationFn: (id: number) => externalSubsApi.refresh(id),
    onSuccess: (_r, id) => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['external-subs', id] });
    },
    onError: apiError,
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => externalSubsApi.remove(id),
    onSuccess: () => {
      setOpenId(null);
      invalidate();
    },
    onError: apiError,
  });

  const copyUrl = () => {
    if (data?.public_url) navigator.clipboard?.writeText(data.public_url);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4">
      <h1 className="text-xl font-bold text-dark-50">
        {t('admin.externalSubs.title', 'Внешние подписки')}
      </h1>

      {/* Global subscription URL */}
      <div className="card space-y-2 p-4">
        <div className="text-sm font-semibold text-dark-100">
          {t('admin.externalSubs.publicUrl', 'Ссылка на подписку (для пользователей)')}
        </div>
        {data?.enabled === false && (
          <div className="text-[12px] text-amber-400">
            {t(
              'admin.externalSubs.disabled',
              'Функция выключена: задайте EXTERNAL_SUBSCRIPTIONS_ENABLED=true в .env',
            )}
          </div>
        )}
        {data?.public_url ? (
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-dark-800/60 px-2 py-1.5 text-[12px] text-dark-200">
              {data.public_url}
            </code>
            <button className="btn btn-secondary text-xs" onClick={copyUrl}>
              {t('common.copy', 'Копировать')}
            </button>
          </div>
        ) : (
          <div className="text-[12px] text-dark-400">
            {t(
              'admin.externalSubs.noToken',
              'Задайте EXTERNAL_SUB_TOKEN в .env, чтобы появилась ссылка',
            )}
          </div>
        )}
        <div className="text-[11px] text-dark-500">
          {t('admin.externalSubs.selectedTotal', 'Выбрано конфигов: {{n}}', {
            n: data?.total_selected ?? 0,
          })}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-400">
          ⚠ {error}
        </div>
      )}

      {/* Add source */}
      <div className="card space-y-3 p-4">
        <div className="text-sm font-semibold text-dark-100">
          {t('admin.externalSubs.addSource', 'Добавить источник')}
        </div>
        <input
          className="input w-full"
          placeholder={t('admin.externalSubs.namePlaceholder', 'Название')}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="input w-full"
          placeholder="https://provider.example/sub/..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <label className="text-[12px] text-dark-400">
            {t('admin.externalSubs.interval', 'Интервал обновления (мин)')}
          </label>
          <input
            type="number"
            className="input w-28"
            value={interval}
            min={5}
            onChange={(e) => setIntervalMin(e.target.value === '' ? '' : Number(e.target.value))}
          />
        </div>
        <button
          className="btn btn-primary"
          disabled={!name || !url || createMut.isPending}
          onClick={() => createMut.mutate()}
        >
          {createMut.isPending
            ? t('admin.externalSubs.fetching', 'Загружаю…')
            : t('admin.externalSubs.addAndFetch', 'Добавить и загрузить')}
        </button>
      </div>

      {/* Sources list */}
      <div className="space-y-2">
        {isLoading && (
          <div className="text-sm text-dark-400">{t('common.loading', 'Загрузка…')}</div>
        )}
        {data?.sources.map((s: ExternalSourceListItem) => (
          <div key={s.id} className="card p-4">
            <div className="flex items-center justify-between gap-3">
              <button
                className="min-w-0 flex-1 text-left"
                onClick={() => setOpenId(openId === s.id ? null : s.id)}
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-dark-50">{s.name}</span>
                  <StatusBadge status={s.last_status} />
                  {!s.is_active && (
                    <span className="text-[11px] text-dark-500">
                      {t('admin.externalSubs.inactive', '(выкл.)')}
                    </span>
                  )}
                </div>
                <div className="truncate text-[11px] text-dark-500">{s.url}</div>
                <div className="text-[11px] text-dark-400">
                  {t('admin.externalSubs.counts', 'Конфигов: {{total}}, выбрано: {{sel}}', {
                    total: s.configs_count,
                    sel: s.selected_count,
                  })}
                </div>
                {s.last_error && (
                  <div className="truncate text-[11px] text-red-400">{s.last_error}</div>
                )}
              </button>
              <div className="flex shrink-0 gap-2">
                <button
                  className="btn btn-secondary text-xs"
                  disabled={refreshMut.isPending}
                  onClick={() => refreshMut.mutate(s.id)}
                >
                  {t('admin.externalSubs.refresh', 'Обновить')}
                </button>
                <button
                  className="btn btn-danger text-xs"
                  onClick={() => {
                    if (window.confirm(t('admin.externalSubs.confirmDelete', 'Удалить источник?')))
                      deleteMut.mutate(s.id);
                  }}
                >
                  {t('common.delete', 'Удалить')}
                </button>
              </div>
            </div>

            {openId === s.id && (
              <SourceConfigs
                detail={detailQuery.data}
                loading={detailQuery.isLoading}
                onError={apiError}
                onSaved={() => {
                  invalidate();
                  queryClient.invalidateQueries({ queryKey: ['external-subs', s.id] });
                }}
              />
            )}
          </div>
        ))}
        {data && data.sources.length === 0 && (
          <div className="text-sm text-dark-400">
            {t('admin.externalSubs.empty', 'Источников пока нет')}
          </div>
        )}
      </div>
    </div>
  );
}

function SourceConfigs({
  detail,
  loading,
  onSaved,
  onError,
}: {
  detail: ExternalSourceDetail | undefined;
  loading: boolean;
  onSaved: () => void;
  onError: (e: unknown) => void;
}) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Set<number> | null>(null);

  const current =
    selected ?? new Set((detail?.configs ?? []).filter((c) => c.is_selected).map((c) => c.id));

  const saveMut = useMutation({
    mutationFn: () => externalSubsApi.setSelection(detail!.id, Array.from(current)),
    onSuccess: () => {
      setSelected(null);
      onSaved();
    },
    onError,
  });

  if (loading)
    return <div className="mt-3 text-[12px] text-dark-400">{t('common.loading', 'Загрузка…')}</div>;
  if (!detail) return null;

  const toggle = (id: number) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  return (
    <div className="mt-3 space-y-2 border-t border-dark-700 pt-3">
      <div className="max-h-72 space-y-1 overflow-y-auto">
        {detail.configs.map((c) => (
          <label
            key={c.id}
            className="flex items-center gap-2 rounded px-2 py-1 text-[12px] hover:bg-dark-800/40"
            style={{ opacity: c.is_active ? 1 : 0.5 }}
          >
            <input type="checkbox" checked={current.has(c.id)} onChange={() => toggle(c.id)} />
            <span className="rounded bg-dark-700 px-1 text-[10px] text-dark-300">
              {c.protocol ?? '?'}
            </span>
            <span className="flex-1 truncate text-dark-100">{c.name}</span>
            {!c.is_active && (
              <span className="text-[10px] text-dark-500">
                {t('admin.externalSubs.gone', 'нет в источнике')}
              </span>
            )}
          </label>
        ))}
        {detail.configs.length === 0 && (
          <div className="text-[12px] text-dark-400">
            {t('admin.externalSubs.noConfigs', 'Конфигов не найдено')}
          </div>
        )}
      </div>
      <button
        className="btn btn-primary text-xs"
        disabled={saveMut.isPending}
        onClick={() => saveMut.mutate()}
      >
        {t('admin.externalSubs.saveSelection', 'Сохранить выбор')}
      </button>
    </div>
  );
}
