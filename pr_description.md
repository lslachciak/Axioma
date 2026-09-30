💡 **What:**
Optimized `calculateCronbachAlphaForSession` in `js/psychometrics.js` to process iteration arrays more efficiently. Instead of using `.map()` and `.filter()` array pipelines and building multiple intermediate nested sub-arrays per row to validate inputs, it now processes items directly into pre-allocated `Float64Array` typed arrays, while continuously tracking standard deviation and mean metrics through incremental square sum and sum accumulations rather than re-traversing the datasets later.

🎯 **Why:**
Calculating Cronbach's Alpha over a large set of results (like 10,000 iterations for testing/analysis) was creating large numbers of transient arrays from `.map()` calls and repeatedly parsing object properties, resulting in heavy garbage collector pressure and slow CPU cycles. The new math formula algebraically tracks squared sums across values.

📊 **Measured Improvement:**
We built a standalone node JS benchmarker for a synthetic session generating 10,000 fake iteration results over the full 57 questions, and calculated the alpha for 19 dimensions.

- **Baseline Time:** ~604.83ms
- **Optimized Time:** ~196.44ms
- **Improvement:** 67.5% reduction in execution time for the calculation logic. Execution is now about 3x faster, providing quicker feedback during dense calculations while lowering memory footprint.
