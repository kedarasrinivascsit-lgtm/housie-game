
const shuffle = (array) => {
    const result = [...array];

    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));

        [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
};

// Generate how many numbers each column will contain.
// Every column gets at least 1 and at most 3 numbers.
const generateColumnCounts = () => {
    const counts = Array(9).fill(1);

    let remaining = 6;

    while (remaining > 0) {
        const eligibleColumns = counts
            .map((count, index) => ({ count, index }))
            .filter((item) => item.count < 3)
            .map((item) => item.index);

        const selectedColumn =
            eligibleColumns[
                Math.floor(Math.random() * eligibleColumns.length)
            ];

        counts[selectedColumn]++;
        remaining--;
    }

    return counts;
};

// Generate combinations of rows for each column.
const getCombinations = (items, count) => {
    const combinations = [];

    const build = (start, current) => {
        if (current.length === count) {
            combinations.push([...current]);
            return;
        }

        for (let i = start; i < items.length; i++) {
            current.push(items[i]);
            build(i + 1, current);
            current.pop();
        }
    };

    build(0, []);

    return shuffle(combinations);
};

// Assign exactly 5 numbers to every row.
const assignRows = (columnCounts) => {
    const rowCapacity = [5, 5, 5];
    const assignments = Array(9);

    const columnOrder = columnCounts
        .map((count, index) => ({ count, index }))
        .sort((a, b) => b.count - a.count);

    const solve = (position) => {
        if (position === 9) {
            return rowCapacity.every((capacity) => capacity === 0);
        }

        const { count, index } = columnOrder[position];

        const availableRows = [0, 1, 2].filter(
            (row) => rowCapacity[row] > 0
        );

        const combinations = getCombinations(
            availableRows,
            count
        );

        for (const rows of combinations) {
            rows.forEach((row) => {
                rowCapacity[row]--;
            });

            assignments[index] = rows;

            if (solve(position + 1)) {
                return true;
            }

            rows.forEach((row) => {
                rowCapacity[row]++;
            });
        }

        return false;
    };

    return solve(0) ? assignments : null;
};

// Generate one valid Tambola ticket.
const generateTicket = () => {
    while (true) {
        const columnCounts = generateColumnCounts();

        const rowAssignments = assignRows(columnCounts);

        if (!rowAssignments) {
            continue;
        }

        const ticket = Array.from(
            { length: 3 },
            () => Array(9).fill(null)
        );

        for (let column = 0; column < 9; column++) {
            let min;
            let max;

            if (column === 0) {
                min = 1;
                max = 9;
            } else if (column === 8) {
                min = 80;
                max = 90;
            } else {
                min = column * 10;
                max = column * 10 + 9;
            }

            const availableNumbers = [];

            for (let number = min; number <= max; number++) {
                availableNumbers.push(number);
            }

            const selectedNumbers = shuffle(availableNumbers)
                .slice(0, columnCounts[column])
                .sort((a, b) => a - b);

            const rows = [...rowAssignments[column]].sort(
                (a, b) => a - b
            );

            rows.forEach((row, index) => {
                ticket[row][column] = selectedNumbers[index];
            });
        }

        return ticket;
    }
};

// Generate unique tickets for a room.
const generateUniqueTickets = (count, existingTickets = []) => {
    const usedTickets = new Set(
        existingTickets.map((ticket) => JSON.stringify(ticket))
    );

    const tickets = [];

    while (tickets.length < count) {
        const ticket = generateTicket();
        const signature = JSON.stringify(ticket);

        if (!usedTickets.has(signature)) {
            usedTickets.add(signature);
            tickets.push(ticket);
        }
    }

    return tickets;
};

module.exports = {
    generateTicket,
    generateUniqueTickets
};
