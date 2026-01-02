import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './button'
import { Select } from './select'

export interface PaginationProps {
    currentPage: number
    totalItems: number
    pageSize: number
    onPageChange: (page: number) => void
    onPageSizeChange: (size: number) => void
    pageSizeOptions?: number[]
    className?: string
    variant?: 'default' | 'minimal'
}

export function Pagination({
    currentPage,
    totalItems,
    pageSize,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions = [10, 20, 50],
    className = '',
    variant = 'default',
}: PaginationProps) {
    const totalPages = Math.ceil(totalItems / pageSize)

    const pageSizeSelectOptions = pageSizeOptions.map((size) => ({
        value: size.toString(),
        label: size.toString(),
    }))

    if (variant === 'minimal') {
        return (
            <div className={`flex items-center gap-2 ${className}`}>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage <= 1}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <span className="text-sm text-muted-foreground min-w-[3rem] text-center">
                        {currentPage} / {totalPages}
                    </span>

                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            {/* Page navigation: < 1/10 > */}
            <div className="flex items-center border rounded-md bg-background shadow-sm h-8 box-border overflow-hidden">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-full w-8 rounded-none rounded-l-md border-r hover:bg-muted"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>

                <span className="text-sm font-medium px-3 min-w-[3rem] text-center flex items-center justify-center h-full">
                    {currentPage} / {totalPages}
                </span>

                <Button
                    variant="ghost"
                    size="icon"
                    className="h-full w-8 rounded-none rounded-r-md border-l hover:bg-muted"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>

            {/* Page size selector */}
            <div className="flex items-center ml-2 h-8">
                <Select
                    value={pageSize.toString()}
                    onChange={(value: string) => onPageSizeChange(Number(value))}
                    options={pageSizeSelectOptions}
                    className="w-[70px] h-full"
                />
            </div>
        </div>
    )
}
