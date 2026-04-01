const { performance } = require('perf_hooks');

const HANDLE_SIZE_PX = 10;
const transform = { scale: 1 };

const getHandles = (box) => {
    const { x, y, width, height } = box;
    return {
        topLeft: { x, y },
        top: { x: x + width / 2, y },
        topRight: { x: x + width, y },
        left: { x, y: y + height / 2 },
        right: { x: x + width, y: y + height / 2 },
        bottomLeft: { x, y: y + height },
        bottom: { x: x + width / 2, y: y + height },
        bottomRight: { x: x + width, y: y + height },
    };
};

const getHandleUnderCursorOld = (point, box) => {
    if (!box) return null;
    const handles = getHandles(box);
    const handleSizeOnCanvas = HANDLE_SIZE_PX / transform.scale;
    for (const [name, pos] of Object.entries(handles)) {
        if (
            point.x >= pos.x - handleSizeOnCanvas / 2 && point.x <= pos.x + handleSizeOnCanvas / 2 &&
            point.y >= pos.y - handleSizeOnCanvas / 2 && point.y <= pos.y + handleSizeOnCanvas / 2
        ) {
            return name;
        }
    }
    return null;
};

const getHandleUnderCursorNew = (point, box) => {
    if (!box) return null;
    const handles = getHandles(box);
    const handleSizeOnCanvas = HANDLE_SIZE_PX / transform.scale;
    for (const name in handles) {
        const pos = handles[name];
        if (
            point.x >= pos.x - handleSizeOnCanvas / 2 && point.x <= pos.x + handleSizeOnCanvas / 2 &&
            point.y >= pos.y - handleSizeOnCanvas / 2 && point.y <= pos.y + handleSizeOnCanvas / 2
        ) {
            return name;
        }
    }
    return null;
};

const box = { x: 100, y: 100, width: 200, height: 200 };
const point = { x: 300, y: 300 }; // bottomRight

const ITERATIONS = 1000000;

// Warmup
for (let i = 0; i < 10000; i++) {
    getHandleUnderCursorOld(point, box);
    getHandleUnderCursorNew(point, box);
}

const startOld = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
    getHandleUnderCursorOld(point, box);
}
const endOld = performance.now();
const timeOld = endOld - startOld;

const startNew = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
    getHandleUnderCursorNew(point, box);
}
const endNew = performance.now();
const timeNew = endNew - startNew;

console.log(`Baseline (Object.entries): ${timeOld.toFixed(2)} ms`);
console.log(`Optimized (for...in): ${timeNew.toFixed(2)} ms`);
console.log(`Improvement: ${((timeOld - timeNew) / timeOld * 100).toFixed(2)}%`);
