<script>
    const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
    const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june',
                    'july', 'august', 'september', 'october', 'november', 'december']

    let now = $state(new Date())
    let currentMonth = $derived(now.getMonth())
    let currentYear = $derived(now.getFullYear())
    let today = $derived(now.getDate())

    // Update date at midnight
    $effect(() => {
        const msUntilMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) - now
        const timeout = setTimeout(() => {
            now = new Date()
        }, msUntilMidnight)
        return () => clearTimeout(timeout)
    })

    function getMonthData(year, month) {
        const firstDay = new Date(year, month, 1)
        const lastDay = new Date(year, month + 1, 0)
        const daysInMonth = lastDay.getDate()

        // Get day of week for first day (0 = Sunday, convert to Monday = 0)
        let startDay = firstDay.getDay() - 1
        if (startDay < 0) startDay = 6

        const weeks = []
        let week = new Array(7).fill(null)
        let dayNum = 1

        // Fill first week
        for (let i = startDay; i < 7 && dayNum <= daysInMonth; i++) {
            week[i] = dayNum++
        }
        weeks.push(week)

        // Fill remaining weeks
        while (dayNum <= daysInMonth) {
            week = new Array(7).fill(null)
            for (let i = 0; i < 7 && dayNum <= daysInMonth; i++) {
                week[i] = dayNum++
            }
            weeks.push(week)
        }

        return {
            name: MONTHS[month],
            year,
            month,
            weeks
        }
    }

    let thisMonth = $derived(getMonthData(currentYear, currentMonth))
    let nextMonthData = $derived(() => {
        const nextMonth = currentMonth + 1
        const nextYear = nextMonth > 11 ? currentYear + 1 : currentYear
        return getMonthData(nextYear, nextMonth % 12)
    })

    function isToday(monthData, day) {
        return day === today &&
               monthData.month === currentMonth &&
               monthData.year === currentYear
    }
</script>

<div class="panel-wrapper">
    <span class="widget-label">calendar</span>
    <div class="panel calendar-panel">
        <div class="months">
            <div class="month">
                <div class="month-header">{thisMonth.name}</div>
                <div class="calendar-grid">
                    <div class="days-header">
                        {#each DAYS as day}
                            <span class="day-name">{day}</span>
                        {/each}
                    </div>
                    <div class="weeks">
                        {#each thisMonth.weeks as week}
                            <div class="week">
                                {#each week as day}
                                    <span
                                        class="day"
                                        class:empty={day === null}
                                        class:today={isToday(thisMonth, day)}
                                    >
                                        {day ?? ''}
                                    </span>
                                {/each}
                            </div>
                        {/each}
                    </div>
                </div>
            </div>
            <div class="month">
                <div class="month-header">{nextMonthData().name}</div>
                <div class="calendar-grid">
                    <div class="days-header">
                        {#each DAYS as day}
                            <span class="day-name">{day}</span>
                        {/each}
                    </div>
                    <div class="weeks">
                        {#each nextMonthData().weeks as week}
                            <div class="week">
                                {#each week as day}
                                    <span
                                        class="day"
                                        class:empty={day === null}
                                    >
                                        {day ?? ''}
                                    </span>
                                {/each}
                            </div>
                        {/each}
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<style>
    .panel-wrapper {
        flex: 1;
    }
    .calendar-panel {
        display: flex;
        flex-direction: column;
    }
    .months {
        display: flex;
        gap: 2rem;
    }
    .month {
        flex: 1;
    }
    .month-header {
        color: var(--txt-2);
        margin-bottom: 0.5rem;
        font-size: 0.85rem;
    }
    .calendar-grid {
        font-size: 0.8rem;
    }
    .days-header {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 0;
        color: var(--txt-3);
        margin-bottom: 0.25rem;
    }
    .day-name {
        text-align: center;
        font-size: 0.7rem;
    }
    .weeks {
        display: flex;
        flex-direction: column;
    }
    .week {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 0;
    }
    .day {
        text-align: center;
        padding: 0.15rem 0;
        color: var(--txt-2);
    }
    .day.empty {
        color: transparent;
    }
    .day.today {
        color: var(--txt-1);
        font-weight: 600;
        background: var(--txt-4);
        border-radius: 3px;
    }
</style>
