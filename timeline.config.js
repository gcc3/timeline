

function tl_init() {
    var eventSource = new Timeline.DefaultEventSource();

    // Timezone
    var date = new Date();
    var timezoneNumber = date.getTimezoneOffset() * (-1) / 60; // For tokyo is 9

    var bandInfos = [
        // Band 1
        Timeline.createBandInfo({
            eventSource: eventSource,
            date: "Jun 28 1900 00:00:00 GMT",
            timeZone: timezoneNumber,
            width: "15%",
            intervalUnit: Timeline.DateTime.YEAR,
            intervalPixels: 200
        }),

        // Band 2
        Timeline.createBandInfo({
            eventSource: eventSource,
            date: "Jun 28 1900 00:00:00 GMT",
            timeZone: timezoneNumber,
            width: "25%",
            intervalUnit: Timeline.DateTime.DECADE,
            intervalPixels: 100
        }),

        // Band 3
        Timeline.createBandInfo({
            eventSource: eventSource,
            date: "Jun 28 1900 00:00:00 GMT",
            timeZone: timezoneNumber,
            width: "60%",
            intervalUnit: Timeline.DateTime.DECADE,
            multiple: 4,
            intervalPixels: 40
        })
    ];

    // Make bands sync
    bandInfos[1].syncWith = 0;
    bandInfos[1].highlight = true;
    bandInfos[2].syncWith = 0;
    bandInfos[2].highlight = true;

    let tl = Timeline.create(document.getElementById("timeline"), bandInfos, Timeline.HORIZONTAL);
    var url = '.'; // The base url for image, icon and background image references in the data
    
    // Load data
    eventSource.loadJSON(tl_renaissance, url);
    eventSource.loadJSON(tl_world_war, url);
    eventSource.loadJSON(tl_philosopher, url);
    eventSource.loadJSON(tl_scientific_revolution, url);

    // Load XML data
    Timeline.loadXML("data.xml", function(xml, url) { eventSource.loadXML(xml, url); });

    tl.layout(); // display the Timeline
    return tl;
}
