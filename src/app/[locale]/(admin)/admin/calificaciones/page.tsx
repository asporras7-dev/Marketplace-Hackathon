import { getLocale, getTranslations } from 'next-intl/server'
import { Star, MessageSquare } from 'lucide-react'
import { PageTitle } from '@/components/features/brand/PageTitle'
import { EmptyState } from '@/components/features/shared/EmptyState'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getAllCompanyRatingsForAdmin } from '@/lib/company/ratings'

export default async function AdminRatingsPage() {
  const t = await getTranslations('Admin')
  const locale = await getLocale()

  const result = await getAllCompanyRatingsForAdmin()
  const ratings = result.ok ? result.data : []

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageTitle
        title={t('adminRatingsTitle')}
        description={t('adminRatingsDesc')}
        dotColor="text-magenta"
      />

      <div className="mt-8">
        {ratings.length === 0 ? (
          <EmptyState
            title={t('noRatingsYet')}
            description={t('noRatingsYetDesc')}
            icon={Star}
          />
        ) : (
          <div className="rounded-2xl border border-border/50 bg-surface shadow-sm overflow-hidden">
            <div className="border-b border-border/50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">
              {t('totalApplications')}: {ratings.length}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('ratingEgresado')}</TableHead>
                  <TableHead>{t('ratingEmpresa')}</TableHead>
                  <TableHead>{t('ratingScore')}</TableHead>
                  <TableHead>{t('ratingComment')}</TableHead>
                  <TableHead>{t('ratingDate')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ratings.map((rating) => (
                  <TableRow key={rating.idEvaluacion}>
                    <TableCell className="font-semibold text-foreground">
                      {rating.nombreEgresado}
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-foreground">
                        {rating.nombreEmpresa}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {rating.proyectoTitulo}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3.5 h-3.5 ${
                              star <= rating.puntuacion
                                ? 'text-highlight fill-highlight'
                                : 'text-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell
                      className="max-w-xs truncate text-muted-foreground"
                      title={rating.comentario || ''}
                    >
                      {rating.comentario ? (
                        <div className="flex items-start gap-1">
                          <MessageSquare className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                          <span className="text-xs truncate">
                            {rating.comentario}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs italic text-gray-300">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {new Date(rating.evaluadoAt).toLocaleDateString(locale, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
