// 1: SET GLOBAL VARIABLES
const margin = { top: 50, right: 30, bottom: 60, left: 100 };
const width = 900 - margin.left - margin.right;
const height = 400 - margin.top - margin.bottom;


const filterContainerDiv = document.createElement('div');
filterContainerDiv.className = 'eu-filter-container';
filterContainerDiv.style.marginBottom = '10px';
filterContainerDiv.style.padding = '5px';
filterContainerDiv.style.backgroundColor = '#f8f8f8';
filterContainerDiv.style.border = '1px solid #ddd';
filterContainerDiv.style.borderRadius = '3px';
filterContainerDiv.style.display = 'flex';
filterContainerDiv.style.justifyContent = 'flex-end';
filterContainerDiv.style.width = '100%';

const filterLabel = document.createElement('label');
filterLabel.htmlFor = 'eu-filter';
filterLabel.textContent = 'Filter by EU National status: ';
filterLabel.style.marginRight = '10px';

const filterSelect = document.createElement('select');
filterSelect.id = 'eu-filter';
filterSelect.style.padding = '5px';

const options = [
    { value: 'all', text: 'All Players' },
    { value: 'Yes', text: 'EU National: Yes' },
    { value: 'No', text: 'EU National: No' }
];

options.forEach(option => {
    const optionElement = document.createElement('option');
    optionElement.value = option.value;
    optionElement.textContent = option.text;
    filterSelect.appendChild(optionElement);
});

filterContainerDiv.appendChild(filterLabel);
filterContainerDiv.appendChild(filterSelect);

const secondChartContainer = document.querySelector('.chart-container:nth-child(4)');
secondChartContainer.insertBefore(filterContainerDiv, document.getElementById('lineChart2'));

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
            euNational: d["EU National"] ? d["EU National"].trim() : d["EU National"],
            lastTransFee: d["Last Trans. Fee"],
            lastTransFeeValue: d["Last Trans. Fee"] === "€0" ? 0 : 
                              d["Last Trans. Fee"].includes("M") ? 
                              parseFloat(d["Last Trans. Fee"].replace("€", "").replace("M", "")) * 1000000 : 
                              parseFloat(d["Last Trans. Fee"].replace("€", "")),
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
    //    CHART 2 - Salary vs Transfer Fee (MODIFIED TO SCATTER PLOT)
    // ==========================================
    
    // Create a linear scale for X axis instead of band scale for scatter plot
    const xScale2 = d3.scaleLinear()
        .domain([0, d3.max(processedData, d => d.lastTransFeeValue) * 1.05])
        .range([0, width]);
    
    // Y scale for the scatter plot
    const yScale2 = d3.scaleLinear()
        .domain([0, d3.max(processedData, d => d.salary) * 1.05])
        .range([height, 0]);
    
    // Function to update Chart 2 based on filter
    function updateChart2(filterValue) {
        // Filter data based on EU National status
        const filteredData = filterValue === "all" 
            ? processedData 
            : processedData.filter(d => d.euNational === filterValue.trim());
            
        console.log("Filtered data count:", filteredData.length);
        console.log("Filter value:", filterValue);
        console.log("Sample filtered data:", filteredData.slice(0, 3));
        
        // Remove existing circles
        svg2.selectAll("circle").remove();
        
        // Add circles with filtered data
        svg2.selectAll("circle")
            .data(filteredData)
            .enter()
            .append("circle")
            .attr("cx", d => xScale2(d.lastTransFeeValue))
            .attr("cy", d => yScale2(d.salary))
            .attr("r", 5)
            .attr("fill", "#4682B4")
            .attr("opacity", 0.7)
            .attr("stroke", "#333")
            .attr("stroke-width", 0.5)
            .on("mouseover", function(event, d) {
                d3.select(this)
                    .attr("r", 8)
                    .attr("stroke-width", 2)
                    .attr("fill", "#81A3C3");
                    
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);
                    
                tooltip.html(`
                    <strong>Transfer Fee:</strong> ${d.lastTransFee}<br>
                    <strong>Salary:</strong> €${d3.format(",.2f")(d.salary)}<br>
                    <strong>Position:</strong> ${d.position}<br>
                    <strong>EU National:</strong> ${d.euNational}<br>
                    <strong>Last Club:</strong> ${d.lastClub}
                `)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function() {
                d3.select(this)
                    .attr("r", 5)
                    .attr("stroke-width", 0.5)
                    .attr("fill", "#4682B4");
                    
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });
    }
    
    // Initialize chart with all data
    updateChart2("all");
    
    // Add event listener to dropdown
    document.getElementById('eu-filter').addEventListener('change', function() {
        console.log("Dropdown changed to:", this.value);
        updateChart2(this.value);
    });
    
    // Log the actual values in the dataset to check what values exist
    const uniqueEUValues = [...new Set(processedData.map(d => d.euNational))];
    console.log("Unique EU National values in dataset:", uniqueEUValues);
    
    // ADD AXES FOR CHART 2 WITH SPREAD OUT TICKS
    // X axis with spread out ticks
    svg2.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(xScale2)
            .tickFormat(d => d >= 1000000 ? `€${d / 1000000}M` : `€${d}`)
            .ticks(8) // Specify number of ticks to spread them out
        );
    
    // Y axis
    svg2.append("g")
        .call(d3.axisLeft(yScale2)
            .tickFormat(d => `€${d3.format(",.0f")(d)}`));
    
    // ADD LABELS FOR CHART 2
    // X axis label
    svg2.append("text")
        .attr("class", "axis-label")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 10)
        .style("text-anchor", "middle")
        .text("Transfer Fee");
    
    // Y axis label
    svg2.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -margin.left + 15)
        .style("text-anchor", "middle")
        .text("Salary in Euros");
    
    // Add title to Chart 2
    svg2.append("text")
        .attr("class", "chart-title")
        .attr("x", width / 2)
        .attr("y", -margin.top / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text("Salary vs Transfer Fee");
});