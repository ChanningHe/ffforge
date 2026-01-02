import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './button'
import { Select } from './select'
import { useApp } from '@/contexts/AppContext'

interface PaginationProps {
    currentPage: number
    totalItems: number
    pageSize: number
    onPageChange: (page: number) => void
    onPageSizeChange: (size: number) => void
    pageSizeOptions?: number[]
}

export function Pagination({
    currentPage,
    totalItems,
    pageSize,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions = [10, 20, 50],
}: PaginationProps) {
    const { t } = useApp()
    const totalPages = Math.ceil(totalItems / pageSize)
    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1
    const endItem = Math.min(currentPage * pageSize, totalItems)

    const pageSizeSelectOptions = pageSizeOptions.map((size) => ({
        value: size.toString(),
        label: size.toString(),
    }))

    return (
        <div className="flex items-center justify-between px-2 py-3 border-t bg-card">
            {/* Left: Items info */}
            <div className="text-sm text-muted-foreground">
                {t.pagination.showing} {startItem}-{endItem} {t.pagination.of} {totalItems}
            </div>

            {/* Center: Page navigation */}
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                >
                    <ChevronLeft className="h-4 w-4" />
                    {t.pagination.previous}
                </Button>

                <span className="text-sm text-muted-foreground px-2">
                    {t.pagination.page} {currentPage} {t.pagination.of} {totalPages}
                </span>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                >
                    {t.pagination.next}
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>

            {/* Right: Page size selector */}
            <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t.pagination.perPage}</span>
                <Select
                    value={pageSize.toString()}
                    onChange={(value: string) => onPageSizeChange(Number(value))}
                    options={pageSizeSelectOptions}
                    className="w-[70px]"
                />
            </div>
        </div>
    )
}
