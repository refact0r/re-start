<script lang="ts">
    interface MonthData {
        name: string
        year: number
        month: number
        weeks: (number | null)[][]
    }

    const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

    let {
        monthData,
        currentMonth,
        currentYear,
        today,
    }: {
        monthData: MonthData
        currentMonth: number
        currentYear: number
        today: number
    } = $props()

    function isToday(day: number | null): boolean {
        return (
            day === today &&
            monthData.month === currentMonth &&
            monthData.year === currentYear
        )
    }
</script>

<div class="month">
    <div class="month-header">{monthData.name}</div>
    <div class="calendar-grid">
        <div class="days-header">
            {#each DAYS as day, dayIndex (dayIndex)}
                <span class="day-name">{day}</span>
            {/each}
        </div>
        <div class="weeks">
            {#each monthData.weeks as week, weekIndex (weekIndex)}
                <div class="week">
                    {#each week as day, dayIndex (`${weekIndex}-${dayIndex}`)}
                        <span
                            class="day"
                            class:empty={day === null}
                            class:today={isToday(day)}
                        >
                            {day ?? ''}
                        </span>
                    {/each}
                </div>
            {/each}
        </div>
    </div>
</div>

<style>
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
        color: var(--txt-2);
        margin-bottom: 0.25rem;
    }

    .day-name {
        text-align: center;
        font-size: 0.75rem;
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
    }
</style>
