<script>
    let { name = 'cloud-sun', size = 28, class: className = '' } = $props()
</script>

<div
    class="weather-icon {className}"
    style={`--icon-size: ${size}px;`}
    aria-hidden="true"
>
    <svg
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
    >
        {#if name === 'cloud-lightning'}
            <path d="M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973" />
            <path class="bolt" d="m13 12-3 5h4l-3 5" />
        {:else if name === 'cloud-rain-wind'}
            <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
            <path class="rain-drop delay-0" d="m9.2 22 3-7" />
            <path class="rain-drop delay-1" d="m9 13-3 7" />
            <path class="rain-drop delay-2" d="m17 13-3 7" />
        {:else if name === 'cloud-rain'}
            <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
            <path class="rain-drop delay-0" d="M16 14v6" />
            <path class="rain-drop delay-1" d="M8 14v6" />
            <path class="rain-drop delay-2" d="M12 16v6" />
        {:else if name === 'cloud-snow'}
            <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
            <path class="snow-dot delay-0" d="M8 15h.01" />
            <path class="snow-dot delay-1" d="M8 19h.01" />
            <path class="snow-dot delay-2" d="M12 17h.01" />
            <path class="snow-dot delay-0" d="M12 21h.01" />
            <path class="snow-dot delay-1" d="M16 15h.01" />
            <path class="snow-dot delay-2" d="M16 19h.01" />
        {:else if name === 'snowflake'}
            <g class="snowflake-spin">
                <path d="m10 20-1.25-2.5L6 18" />
                <path d="M10 4 8.75 6.5 6 6" />
                <path d="m14 20 1.25-2.5L18 18" />
                <path d="m14 4 1.25 2.5L18 6" />
                <path d="m17 21-3-6h-4" />
                <path d="m17 3-3 6 1.5 3" />
                <path d="M2 12h6.5L10 9" />
                <path d="m20 10-1.5 2 1.5 2" />
                <path d="M22 12h-6.5L14 15" />
                <path d="m4 10 1.5 2L4 14" />
                <path d="m7 21 3-6-1.5-3" />
                <path d="m7 3 3 6h4" />
            </g>
        {:else if name === 'sun'}
            <circle cx="12" cy="12" r="4" />
            <path class="sun-ray" style="--delay: 0ms;" d="M12 2v2" />
            <path
                class="sun-ray"
                style="--delay: 100ms;"
                d="m19.07 4.93-1.41 1.41"
            />
            <path class="sun-ray" style="--delay: 200ms;" d="M20 12h2" />
            <path
                class="sun-ray"
                style="--delay: 300ms;"
                d="m17.66 17.66 1.41 1.41"
            />
            <path class="sun-ray" style="--delay: 400ms;" d="M12 20v2" />
            <path
                class="sun-ray"
                style="--delay: 500ms;"
                d="m6.34 17.66-1.41 1.41"
            />
            <path class="sun-ray" style="--delay: 600ms;" d="M2 12h2" />
            <path
                class="sun-ray"
                style="--delay: 700ms;"
                d="m4.93 4.93 1.41 1.41"
            />
        {:else if name === 'sunset'}
            <g class="sunset-arrow">
                <path d="M12 10V2" />
                <path d="m16 6-4 4-4-4" />
            </g>
            <path class="sun-ray" style="--delay: 100ms;" d="m4.93 10.93 1.41 1.41" />
            <path class="sun-ray" style="--delay: 200ms;" d="M2 18h2" />
            <path class="sun-ray" style="--delay: 300ms;" d="M20 18h2" />
            <path
                class="sun-ray"
                style="--delay: 400ms;"
                d="m19.07 10.93-1.41 1.41"
            />
            <path class="sun-ray" style="--delay: 500ms;" d="M22 22H2" />
            <path d="M16 18a4 4 0 0 0-8 0" />
        {:else if name === 'wind'}
            <path class="wind-stroke delay-1" d="M12.8 19.6A2 2 0 1 0 14 16H2" />
            <path class="wind-stroke delay-0" d="M17.5 8a2.5 2.5 0 1 1 2 4H2" />
            <path class="wind-stroke delay-2" d="M9.8 4.4A2 2 0 1 1 11 8H2" />
        {:else}
            <g class="cloud-sun">
                <path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z" />
            </g>
            <path class="sun-ray" style="--delay: 0ms;" d="M12 2v2" />
            <path
                class="sun-ray"
                style="--delay: 100ms;"
                d="m4.93 4.93 1.41 1.41"
            />
            <path class="sun-ray" style="--delay: 200ms;" d="M20 12h2" />
            <path
                class="sun-ray"
                style="--delay: 300ms;"
                d="m19.07 4.93-1.41 1.41"
            />
            <path
                class="sun-ray"
                style="--delay: 400ms;"
                d="M15.947 12.65a4 4 0 0 0-5.925-4.128"
            />
        {/if}
    </svg>
</div>

<style>
    .weather-icon {
        width: var(--icon-size);
        height: var(--icon-size);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: var(--txt-2);
    }
    .weather-icon svg {
        width: 100%;
        height: 100%;
        overflow: visible;
    }
    .bolt {
        animation: lightningPulse 2.8s ease-in-out infinite;
    }
    .rain-drop {
        animation: rainPulse 2.4s ease-in-out infinite;
    }
    .rain-drop.delay-1 {
        animation-delay: 420ms;
    }
    .rain-drop.delay-2 {
        animation-delay: 840ms;
    }
    .snow-dot {
        animation: snowPulse 3.2s ease-in-out infinite;
    }
    .snow-dot.delay-1 {
        animation-delay: 540ms;
    }
    .snow-dot.delay-2 {
        animation-delay: 1080ms;
    }
    .snowflake-spin {
        transform-origin: center;
        animation: snowflakeDrift 5.6s ease-in-out infinite;
    }
    .sun-ray {
        animation: rayBlink 3.6s ease-in-out infinite;
        animation-delay: var(--delay);
    }
    .sunset-arrow {
        transform-origin: center;
        animation: sunsetShift 2.8s ease-in-out infinite;
    }
    .wind-stroke {
        stroke-dasharray: 30;
        stroke-dashoffset: 0;
        animation: windDraw 3.2s ease-in-out infinite;
    }
    .wind-stroke.delay-1 {
        animation-delay: 480ms;
    }
    .wind-stroke.delay-2 {
        animation-delay: 960ms;
    }
    .cloud-sun {
        transform-origin: center;
        animation: cloudFloat 4.8s ease-in-out infinite;
    }

    @keyframes lightningPulse {
        0%,
        100% {
            opacity: 1;
        }
        45% {
            opacity: 0.35;
        }
    }
    @keyframes rainPulse {
        0%,
        100% {
            opacity: 1;
        }
        50% {
            opacity: 0.3;
        }
    }
    @keyframes snowPulse {
        0%,
        100% {
            opacity: 1;
        }
        50% {
            opacity: 0.35;
        }
    }
    @keyframes snowflakeDrift {
        0%,
        100% {
            transform: rotate(0deg);
        }
        25% {
            transform: rotate(-4deg);
        }
        75% {
            transform: rotate(4deg);
        }
    }
    @keyframes rayBlink {
        0%,
        100% {
            opacity: 1;
        }
        40% {
            opacity: 0.25;
        }
    }
    @keyframes sunsetShift {
        0%,
        100% {
            transform: translateY(0);
        }
        50% {
            transform: translateY(1px);
        }
    }
    @keyframes windDraw {
        0% {
            stroke-dashoffset: 26;
            opacity: 0.3;
        }
        40%,
        100% {
            stroke-dashoffset: 0;
            opacity: 1;
        }
    }
    @keyframes cloudFloat {
        0%,
        100% {
            transform: translate(0, 0);
        }
        50% {
            transform: translate(0.5px, -0.5px);
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .weather-icon * {
            animation: none !important;
        }
    }
</style>
