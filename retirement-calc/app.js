/**
 * @typedef {Object} SimulationState
 * @property {number} initialInvestment - Portfolio value at retirement start (USD)
 * @property {number} inflationRate - Annual inflation rate (percent, e.g. 3 = 3%)
 * @property {number} withdrawalRate - Annual withdrawal as % of initial portfolio
 * @property {number} years - Anticipated years in retirement
 * @property {boolean} isMonthly - true => monthly periods; false => annual periods
 * @property {number} firstWithdrawalPeriods - Periods of expenses taken upfront on day 1
 * @property {string} currentPreset - Key into portfolioPresets, or 'custom'
 * @property {number} cagr - Expected compound annual growth rate (percent)
 * @property {number} volatility - Annualized volatility (percent)
 */

/**
 * @typedef {Object} PortfolioPreset
 * @property {string} name
 * @property {number} cagr - percent
 * @property {number} volatility - percent
 * @property {string} description
 */

/**
 * @typedef {Object} PathPoint
 * @property {number} period - 0-indexed simulation period (year or month)
 * @property {number} year - Period expressed in years (period / periodsPerYear)
 * @property {number|null} median - Geometric-mean portfolio value; null after depletion
 * @property {number|null} mean - Arithmetic-mean portfolio value; null after depletion
 * @property {number|null} withdrawal - Withdrawal taken at start of this period; null after depletion
 */

/** @type {SimulationState} */
let state = {
    initialInvestment: 4000000,
    inflationRate: 3,
    withdrawalRate: 3.8,
    years: 40,
    isMonthly: false,
    firstWithdrawalPeriods: 1,
    currentPreset: 'aggressive'
};

/** @type {Object<string, PortfolioPreset>} */
const portfolioPresets = {
    'aggressive': {
        name: 'Aggressive (100% U.S. Stocks)',
        cagr: 9.8,
        volatility: 19.5,
        description: 'U.S. Total Stock Market'
    },
    'mod-aggressive': {
        name: 'Moderately Aggressive (80/20)',
        cagr: 8.4,
        volatility: 15.5,
        description: '80% Stocks / 20% Bonds'
    },
    'moderate': {
        name: 'Moderate (60/40)',
        cagr: 8.1,
        volatility: 11.8,
        description: '60% Stocks / 40% Bonds'
    },
    'mod-conservative': {
        name: 'Moderately Conservative (40/60)',
        cagr: 7.4,
        volatility: 9.0,
        description: '40% Stocks / 60% Bonds'
    },
    'conservative': {
        name: 'Conservative (20/80)',
        cagr: 6.5,
        volatility: 6.8,
        description: '20% Stocks / 80% Bonds'
    },
    'very-conservative': {
        name: 'Very Conservative (100% U.S. Bonds)',
        cagr: 5.1,
        volatility: 6.2,
        description: 'U.S. Aggregate Bonds'
    }
};

// ===================================================================
// Calculation
// ===================================================================

function formatCurrency(value) {
    if (value === null || value === undefined || isNaN(value)) return '$0';
    return '$' + Math.round(value).toLocaleString();
}

/**
 * Project portfolio path using geometric Brownian motion. Withdrawal happens
 * at the start of each period, then the remainder grows for the period.
 * Returns one entry per period including period 0 (initial state).
 * @returns {PathPoint[]}
 */
function calculatePortfolioPath() {
    const data = [];
    const stdDev = state.volatility / 100;
    const periodsPerYear = state.isMonthly ? 12 : 1;

    const periodGrowthRate = Math.log(1 + state.cagr / 100) / periodsPerYear;
    const periodStdDev = stdDev / Math.sqrt(periodsPerYear);
    const periodMu = periodGrowthRate - (periodStdDev * periodStdDev) / 2;

    const periodicInflationRate = state.isMonthly ?
        Math.pow(1 + state.inflationRate / 100, 1/12) - 1 :
        state.inflationRate / 100;

    let annualWithdrawal = (state.initialInvestment * state.withdrawalRate) / 100;
    let periodWithdrawal = annualWithdrawal / periodsPerYear;
    const firstPeriodWithdrawal = state.firstWithdrawalPeriods * periodWithdrawal;

    data.push({
        period: 0,
        year: 0,
        median: state.initialInvestment,
        mean: state.initialInvestment,
        withdrawal: firstPeriodWithdrawal
    });

    let currentMedian = state.initialInvestment;
    let currentMean = state.initialInvestment;

    const totalPeriods = state.years * periodsPerYear;
    const upfrontPeriods = state.firstWithdrawalPeriods;
    for (let period = 1; period <= totalPeriods; period++) {
        const year = period / periodsPerYear;

        let withdrawal;
        if (period === 1) {
            withdrawal = firstPeriodWithdrawal;
        } else if (period <= upfrontPeriods) {
            withdrawal = 0;
        } else {
            withdrawal = periodWithdrawal;
        }
        const postWithdrawalMedian = Math.max(0, currentMedian - withdrawal);
        const postWithdrawalMean = Math.max(0, currentMean - withdrawal);

        currentMedian = postWithdrawalMedian * Math.exp(periodMu);
        currentMean = postWithdrawalMean * Math.exp(periodGrowthRate);

        periodWithdrawal *= (1 + periodicInflationRate);

        const displayedWithdrawal = period < upfrontPeriods ? 0 : periodWithdrawal;

        data.push({
            period,
            year,
            median: currentMedian,
            mean: currentMean,
            withdrawal: displayedWithdrawal
        });
    }

    const processedData = data.map(point => ({
        ...point,
        withdrawal: point.median === 0 ? null :
                   point.median < point.withdrawal ? point.median :
                   point.withdrawal
    }));

    const truncateIndex = processedData.findIndex((point, index) =>
        index > 0 && point.withdrawal === null
    );

    if (truncateIndex !== -1) {
        return processedData.map((point, index) => {
            if (index >= truncateIndex + 1) {
                return {
                    ...point,
                    median: null,
                    mean: null,
                    withdrawal: null
                };
            }
            return point;
        });
    }

    return processedData;
}

// ===================================================================
// Chart
// ===================================================================

let chartInstance = null;

function drawChart(data) {
    const canvas = document.getElementById('portfolioChart');
    const ctx = canvas.getContext('2d');

    if (chartInstance) {
        chartInstance.destroy();
    }

    const filteredData = data;

    const labels = filteredData.map(point => point.year);
    const medianData = filteredData.map(point => point.median);
    const withdrawalData = filteredData.map(point => point.withdrawal);

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Average Outcome',
                    data: medianData,
                    borderColor: '#1e3a5f',
                    backgroundColor: 'rgba(30, 58, 95, 0.1)',
                    borderWidth: 2.5,
                    tension: 0,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    spanGaps: false
                },
                {
                    label: state.isMonthly ? 'Monthly Withdrawal' : 'Annual Withdrawal',
                    data: withdrawalData,
                    borderColor: '#059669',
                    backgroundColor: 'rgba(5, 150, 105, 0.1)',
                    borderWidth: 2,
                    stepped: 'before',
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    spanGaps: false,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    titleColor: '#c9a876',
                    bodyColor: '#fff',
                    padding: 12,
                    displayColors: true,
                    callbacks: {
                        title: function(context) {
                            const dataIndex = context[0].dataIndex;
                            const point = filteredData[dataIndex];

                            if (state.isMonthly) {
                                const yearNum = Math.floor(point.year);
                                const monthNum = Math.round((point.year % 1) * 12);
                                return `Year ${yearNum}, Start of Month ${monthNum}`;
                            } else {
                                return `Start of Year ${Math.floor(point.year)}`;
                            }
                        },
                        label: function(context) {
                            const datasetLabel = context.dataset.label;
                            const value = context.parsed.y;
                            if (value === null) {
                                return `${datasetLabel}: N/A`;
                            }
                            return `${datasetLabel}: ${formatCurrency(value)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    title: {
                        display: true,
                        text: 'Year',
                        font: {
                            size: 13,
                            weight: 'bold'
                        }
                    },
                    ticks: {
                        stepSize: 1,
                        autoSkip: true,
                        maxRotation: 45,
                        minRotation: 0,
                        callback: function(value) {
                            return Math.floor(value);
                        }
                    },
                    grid: {
                        color: '#f0f0f0'
                    }
                },
                y: {
                    type: 'linear',
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Portfolio Value',
                        font: {
                            size: 13,
                            weight: 'bold'
                        },
                        color: '#1e3a5f'
                    },
                    ticks: {
                        callback: function(value) {
                            return '$' + (value / 1000000).toFixed(1) + 'M';
                        },
                        color: '#1e3a5f'
                    },
                    grid: {
                        color: '#f0f0f0'
                    }
                },
                y1: {
                    type: 'linear',
                    position: 'left',
                    title: {
                        display: true,
                        text: state.isMonthly ? 'Monthly Withdrawal' : 'Annual Withdrawal',
                        font: {
                            size: 13,
                            weight: 'bold'
                        },
                        color: '#059669'
                    },
                    ticks: {
                        callback: function(value) {
                            if (value >= 1000000) {
                                return '$' + (value / 1000000).toFixed(1) + 'M';
                            } else if (value >= 1000) {
                                return '$' + (value / 1000).toFixed(0) + 'K';
                            } else {
                                return '$' + value.toFixed(0);
                            }
                        },
                        color: '#059669'
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
}

// ===================================================================
// Data table
// ===================================================================

function populateDataTable(data) {
    const tbody = document.getElementById('dataTableBody');
    tbody.innerHTML = '';

    const withdrawalHeader = document.getElementById('withdrawalHeader');
    withdrawalHeader.textContent = state.isMonthly ? 'Monthly Withdrawal' : 'Annual Withdrawal';

    // Show one row per year regardless of frequency
    const displayData = state.isMonthly
        ? data.filter((_, index) => index % 12 === 0)
        : data;

    displayData.forEach(point => {
        const row = document.createElement('tr');

        const yearCell = document.createElement('td');
        yearCell.textContent = Math.floor(point.year);

        const medianCell = document.createElement('td');
        medianCell.textContent = point.median !== null ? formatCurrency(point.median) : 'N/A';

        const withdrawalCell = document.createElement('td');
        withdrawalCell.textContent = point.withdrawal !== null ? formatCurrency(point.withdrawal) : 'N/A';

        row.appendChild(yearCell);
        row.appendChild(medianCell);
        row.appendChild(withdrawalCell);

        tbody.appendChild(row);
    });
}

// ===================================================================
// Display update (single source of truth — call after any state change)
// ===================================================================

function updateDisplay() {
    const data = calculatePortfolioPath();

    document.getElementById('initialInvestmentValue').textContent = formatCurrency(state.initialInvestment);

    const annualWithdrawal = (state.initialInvestment * state.withdrawalRate) / 100;
    const monthlyWithdrawal = annualWithdrawal / 12;

    document.getElementById('withdrawalRateValue').textContent = `${state.withdrawalRate}%`;
    document.getElementById('inflationRateValue').textContent = `${state.inflationRate}%`;
    document.getElementById('cagrValue').textContent = `${state.cagr}%`;
    document.getElementById('volatilityValue').textContent = `${state.volatility}%`;
    document.getElementById('yearsValue').textContent = `${state.years} years`;

    document.getElementById('annualAmount').textContent = `${formatCurrency(annualWithdrawal)}/year`;
    document.getElementById('monthlyAmount').textContent = `${formatCurrency(monthlyWithdrawal)}/month`;

    const periodAmount = state.isMonthly ? monthlyWithdrawal : annualWithdrawal;
    const firstWithdrawalAmount = state.firstWithdrawalPeriods * periodAmount;
    const unit = state.isMonthly ? 'month' : 'year';
    const periodsLabel = state.firstWithdrawalPeriods === 1 ? `1 ${unit}` : `${state.firstWithdrawalPeriods} ${unit}s`;
    document.getElementById('firstWithdrawalPeriodsValue').textContent = `${periodsLabel} (${formatCurrency(firstWithdrawalAmount)})`;

    document.getElementById('withdrawalLegend').textContent =
        state.isMonthly ? 'Monthly Withdrawal' : 'Annual Withdrawal';

    // Last point with a live portfolio (terminal year + closing balance)
    const lastPortfolioPoint = [...data].reverse().find(point => point.median !== null && point.median > 0);
    // Last point with a withdrawal (final withdrawal display)
    const lastWithdrawalPoint = [...data].reverse().find(point => point.withdrawal !== null);
    const terminalYear = lastPortfolioPoint ? Math.floor(lastPortfolioPoint.year) : state.years;
    const portfolioLasts = terminalYear >= state.years;

    const statusBanner = document.getElementById('portfolioStatusBanner');
    const statusIcon = document.getElementById('statusIcon');
    const statusTitle = document.getElementById('statusTitle');
    const statusMessage = document.getElementById('statusMessage');

    if (portfolioLasts) {
        statusBanner.className = 'portfolio-status-banner success';
        statusIcon.className = 'status-icon success';
        statusIcon.textContent = '✓';
        statusTitle.className = 'status-title success';
        statusTitle.textContent = 'Portfolio is Sustainable';
        statusMessage.className = 'status-message success';
        statusMessage.textContent = `Your portfolio will last the full ${state.years} year time horizon`;
    } else {
        const yearsShort = state.years - terminalYear;
        statusBanner.className = 'portfolio-status-banner warning';
        statusIcon.className = 'status-icon warning';
        statusIcon.textContent = '⚠';
        statusTitle.className = 'status-title warning';
        statusTitle.textContent = 'Portfolio Depletes Prematurely';
        statusMessage.className = 'status-message warning';
        statusMessage.textContent = `Your portfolio can only sustain full withdrawals through Year ${terminalYear}, falling ${yearsShort} ${yearsShort === 1 ? 'year' : 'years'} short of your ${state.years}-year goal.`;
    }

    document.getElementById('terminalTitle').textContent = `Final Portfolio Values (Year ${terminalYear})`;
    document.getElementById('statMedianPortfolio').textContent =
        formatCurrency(lastPortfolioPoint?.median);
    document.getElementById('statFinalWithdrawal').textContent =
        formatCurrency((lastWithdrawalPoint?.withdrawal || 0) * (state.isMonthly ? 12 : 1));

    drawChart(data);
    populateDataTable(data);
}

// ===================================================================
// Preset handling
// ===================================================================

function applyPreset(presetKey) {
    if (presetKey === 'custom') {
        state.currentPreset = 'custom';
        return;
    }

    const preset = portfolioPresets[presetKey];
    if (!preset) {
        return;
    }

    state.currentPreset = presetKey;
    state.cagr = preset.cagr;
    state.volatility = preset.volatility;

    document.getElementById('cagr').value = preset.cagr;
    document.getElementById('volatility').value = preset.volatility;

    updateDisplay();
}

function switchToCustom() {
    if (state.currentPreset !== 'custom') {
        state.currentPreset = 'custom';
        document.getElementById('portfolioPreset').value = 'custom';
    }
}

// ===================================================================
// Event wiring
// ===================================================================

document.getElementById('portfolioPreset').addEventListener('change', (e) => {
    applyPreset(e.target.value);
});

document.getElementById('initialInvestment').addEventListener('input', (e) => {
    state.initialInvestment = parseInt(e.target.value);
    updateDisplay();
});

document.getElementById('withdrawalRate').addEventListener('input', (e) => {
    state.withdrawalRate = parseFloat(e.target.value);
    updateDisplay();
});

document.getElementById('inflationRate').addEventListener('input', (e) => {
    state.inflationRate = parseFloat(e.target.value);
    updateDisplay();
});

document.getElementById('cagr').addEventListener('input', (e) => {
    state.cagr = parseFloat(e.target.value);
    switchToCustom();
    updateDisplay();
});

document.getElementById('volatility').addEventListener('input', (e) => {
    state.volatility = parseFloat(e.target.value);
    switchToCustom();
    updateDisplay();
});

document.getElementById('years').addEventListener('input', (e) => {
    state.years = parseInt(e.target.value);
    updateDisplay();
});

function updateUpfrontPeriodsMax() {
    const slider = document.getElementById('firstWithdrawalPeriods');
    const max = state.isMonthly ? 120 : 10;
    slider.max = max;
    if (state.firstWithdrawalPeriods > max) {
        state.firstWithdrawalPeriods = max;
    }
    slider.value = state.firstWithdrawalPeriods;
}

document.getElementById('frequencyAnnual').addEventListener('change', (e) => {
    if (e.target.checked) {
        if (state.isMonthly) {
            state.firstWithdrawalPeriods = Math.max(1, Math.round(state.firstWithdrawalPeriods / 12));
        }
        state.isMonthly = false;
        updateUpfrontPeriodsMax();
        updateDisplay();
    }
});

document.getElementById('frequencyMonthly').addEventListener('change', (e) => {
    if (e.target.checked) {
        if (!state.isMonthly) {
            state.firstWithdrawalPeriods = state.firstWithdrawalPeriods * 12;
        }
        state.isMonthly = true;
        updateUpfrontPeriodsMax();
        updateDisplay();
    }
});

document.getElementById('firstWithdrawalPeriods').addEventListener('input', (e) => {
    state.firstWithdrawalPeriods = parseInt(e.target.value);
    updateDisplay();
});

window.addEventListener('resize', () => {
    updateDisplay();
});

document.getElementById('dataTableToggle').addEventListener('click', () => {
    const content = document.getElementById('dataTableContent');
    const icon = document.getElementById('toggleIcon');

    if (content.classList.contains('expanded')) {
        content.classList.remove('expanded');
        icon.classList.remove('expanded');
    } else {
        content.classList.add('expanded');
        icon.classList.add('expanded');
    }
});

document.getElementById('methodologyToggle').addEventListener('click', () => {
    const content = document.getElementById('methodologyContent');
    const icon = document.getElementById('methodologyToggleIcon');

    if (content.classList.contains('expanded')) {
        content.classList.remove('expanded');
        icon.classList.remove('expanded');
    } else {
        content.classList.add('expanded');
        icon.classList.add('expanded');
    }
});

// ===================================================================
// Initial render
// ===================================================================

document.getElementById('initialInvestment').value = state.initialInvestment;
document.getElementById('withdrawalRate').value = state.withdrawalRate;
document.getElementById('inflationRate').value = state.inflationRate;
document.getElementById('years').value = state.years;
document.getElementById('firstWithdrawalPeriods').value = state.firstWithdrawalPeriods;

applyPreset(state.currentPreset);
