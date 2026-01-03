<script lang="ts">
    import { Panel, Row, CalendarGrid } from './ui'

    interface MonthData {
        name: string
        year: number
        month: number
        weeks: (number | null)[][]
    }

    const MONTHS = [
        'january',
        'february',
        'march',
        'april',
        'may',
        'june',
        'july',
        'august',
        'september',
        'october',
        'november',
        'december',
    ]

    let now = $state(new Date())
    let currentMonth = $derived(now.getMonth())
    let currentYear = $derived(now.getFullYear())
    let today = $derived(now.getDate())

    $effect(() => {
        const msUntilMidnight =
            new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate() + 1
            ).getTime() - now.getTime()
        const timeout = setTimeout(() => {
            now = new Date()
        }, msUntilMidnight)
        return () => clearTimeout(timeout)
    })

    function getMonthData(year: number, month: number): MonthData {
        const firstDay = new Date(year, month, 1)
        const lastDay = new Date(year, month + 1, 0)
        const daysInMonth = lastDay.getDate()

        let startDay = firstDay.getDay() - 1
        if (startDay < 0) startDay = 6

        const weeks = []
        let week = new Array(7).fill(null)
        let dayNum = 1

        for (let i = startDay; i < 7 && dayNum <= daysInMonth; i++) {
            week[i] = dayNum++
        }
        weeks.push(week)

        while (dayNum <= daysInMonth) {
            week = new Array(7).fill(null)
            for (let i = 0; i < 7 && dayNum <= daysInMonth; i++) {
                week[i] = dayNum++
            }
            weeks.push(week)
        }

        return { name: MONTHS[month], year, month, weeks }
    }

    let thisMonth = $derived(getMonthData(currentYear, currentMonth))
    let nextMonthData = $derived(() => {
        const nextMonth = currentMonth + 1
        const nextYear = nextMonth > 11 ? currentYear + 1 : currentYear
        return getMonthData(nextYear, nextMonth % 12)
    })
</script>

<Panel label="calendar" flex={1} noFade noPaddingBottom>
    <Row gap="xl">
        <CalendarGrid
            monthData={thisMonth}
            {currentMonth}
            {currentYear}
            {today}
        />
        <CalendarGrid
            monthData={nextMonthData()}
            {currentMonth}
            {currentYear}
            {today}
        />
    </Row>
</Panel>
