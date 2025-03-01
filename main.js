// D3.js code for Soccer Player Salary Visualization

// 1: SET GLOBAL VARIABLES
const margin = { top: 50, right: 30, bottom: 60, left: 70 };
const width = 900 - margin.left - margin.right;
const height = 400 - margin.top - margin.bottom;

// Create SVG containers for both charts
const svg1 = d3.select("#lineChart1")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

const svg2 = d3.select("#lineChart2")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// Tooltip element for interactivity
const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0)
    .style("position", "absolute")
    .style("background-color", "white")
    .style("border", "1px solid #ddd")
    .style("border-radius", "3px")
    .style("padding", "10px")
    .style("pointer-events", "none")
    .style("z-index", "1000");

// 2.a: LOAD DATA FROM CSV
d3.csv("raw_wages.csv").then(function(data) {
    console.log("CSV data loaded:", data);
    
    // 2.b: TRANSFORM DATA
    const processedData = data.map(d => {
        return {
            division: d.Division,
            based: d.Based,
            appearances: +d.ATApps,
            position: d.Position,
            age: +d.Age,
            lastClub: d["Last Club"],
            lastTransFee: d["Last Trans. Fee"],
            // Convert transfer fee to numeric value for calculations
            lastTransFeeValue: d["Last Trans. Fee"] === "€0" ? 0 : 
                              d["Last Trans. Fee"].includes("M") ? 
                              parseFloat(d["Last Trans. Fee"].replace("€", "").replace("M", "")) * 1000000 : 
                              parseFloat(d["Last Trans. Fee"].replace("€", "")),
            // Convert salary to numeric value
            salary: parseFloat(d.Salary.replace("€", "").replace(/,/g, ""))
        };
    });
        
    // ==========================================
    //    CHART 1 - Salary vs Appearances
    // ==========================================
    
    // 3.a: SET SCALES FOR CHART 1
    const xScale1 = d3.scaleLinear()
        .domain([0, d3.max(processedData, d => d.appearances) * 1.05])
        .range([0, width]);
    
    const yScale1 = d3.scaleLinear()
        .domain([0, d3.max(processedData, d => d.salary) * 1.05])
        .range([height, 0]);
    

    // 4.a: PLOT DATA FOR CHART 1
    svg1.selectAll("circle")
        .data(processedData)
        .enter()
        .append("circle")
        .attr("cx", d => xScale1(d.appearances))
        .attr("cy", d => yScale1(d.salary))
        .attr("r", 5)
        .attr("opacity", 0.7)
        .attr("stroke", "#333")
        .attr("stroke-width", 0.5)
        .on("mouseover", function(event, d) {
            d3.select(this)
                .attr("r", 8)
                .attr("stroke-width", 2);
                
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
                
            tooltip.html(`
                <strong>Position:</strong> ${d.position}<br>
                <strong>Appearances:</strong> ${d.appearances}<br>
                <strong>Salary:</strong> €${d3.format(",.2f")(d.salary)}<br>
                <strong>Age:</strong> ${d.age}<br>
                <strong>Last Club:</strong> ${d.lastClub}
            `)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            d3.select(this)
                .attr("r", 5)
                .attr("stroke-width", 0.5);
                
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });

    // 5.a: ADD AXES FOR CHART 1
    // X axis
    svg1.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(xScale1)
            .tickFormat(d => d)
        );
    
    // Y axis
    svg1.append("g")
        .call(d3.axisLeft(yScale1)
            .tickFormat(d => `€${d3.format(",.0f")(d)}`));

    // 6.a: ADD LABELS FOR CHART 1
        
    // X axis label
    svg1.append("text")
        .attr("class", "axis-label")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 10)
        .style("text-anchor", "middle")
        .text("Appearances");
    
    // Y axis label
    svg1.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -margin.left + 15)
        .style("text-anchor", "middle")
        .text("Salary in Euros");
    
    // ==========================================
    //    CHART 2 - Salary vs Transfer Fee
    // ==========================================
    
    // Group data by Last Trans. Fee
    const transFeesGrouped = d3.group(processedData, d => d.lastTransFee);
    console.log("Grouped by transfer fee:", transFeesGrouped);
    
    // Calculate average salary for each transfer fee
    const avgSalaryByTransFee = Array.from(transFeesGrouped, ([key, values]) => {
        const avg = d3.mean(values, d => d.salary);
        return {
            lastTransFee: key,
            lastTransFeeValue: values[0].lastTransFeeValue,
            avgSalary: avg,
            count: values.length
        };
    });
    
    console.log("Average salary by transfer fee:", avgSalaryByTransFee);
    
    // Sort data by transfer fee
    avgSalaryByTransFee.sort((a, b) => a.lastTransFeeValue - b.lastTransFeeValue);
    
    // X scale
    const xScale = d3.scaleBand()
        .domain(avgSalaryByTransFee.map(d => d.lastTransFee))
        .range([0, width])
        .padding(0.1);
    
    // Y scale
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(avgSalaryByTransFee, d => d.avgSalary) * 1.1])
        .range([height, 0]);
    
    // PLOT DATA FOR CHART 2
    svg2.selectAll(".bar")
        .data(avgSalaryByTransFee)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => xScale(d.lastTransFee))
        .attr("y", d => yScale(d.avgSalary))
        .attr("width", xScale.bandwidth())
        .attr("height", d => height - yScale(d.avgSalary))
        .attr("fill", "#4682B4")
        .on("mouseover", function(event, d) {
            d3.select(this).attr("fill", "#81A3C3");
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            tooltip.html(`
                <strong>Transfer Fee:</strong> ${d.lastTransFee}<br>
                <strong>Average Salary:</strong> €${d3.format(",.2f")(d.avgSalary)}<br>
                <strong>Number of Players:</strong> ${d.count}
            `)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            d3.select(this).attr("fill", "#4682B4");
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });
    
    // ADD AXES FOR CHART 2
    // X axis
    svg2.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(xScale)
            .tickFormat(d => d)
            .tickValues(xScale.domain().filter((d, i) => i % 3 === 0))
        )
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end")
        .style("font-size", "10px");
    
    // Y axis
    svg2.append("g")
        .call(d3.axisLeft(yScale)
            .tickFormat(d => `€${d3.format(",.0f")(d)}`));
    
    // ADD LABELS FOR CHART 2
    // X axis label
    svg2.append("text")
        .attr("class", "axis-label")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 5)
        .style("text-anchor", "middle")
        .text("Last Trans. Fee");
    
    // Y axis label
    svg2.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -margin.left + 15)
        .style("text-anchor", "middle")
        .text("AVERAGE of Salary");
    
    // Add title to Chart 2
    svg2.append("text")
        .attr("class", "chart-title")
        .attr("x", width / 2)
        .attr("y", -margin.top / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text("Average Salary by Transfer Fee");
});