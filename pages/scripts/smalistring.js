let extractedStrings = [];

function extractStrings() {
    const input = document.getElementById('smaliInput').value;
    const regex = /const-string(?:\/jumbo)?\s+\w+,\s+"(.*?)"/g;
    let match;
    extractedStrings = [];

    while ((match = regex.exec(input)) !== null) {
        extractedStrings.push(match[1]);
    }

    const outputDiv = document.getElementById('output');
    if(extractedStrings.length > 0){
        outputDiv.innerHTML = extractedStrings.map(s => `<div>${s}</div>`).join('');
    } else {
        outputDiv.innerHTML = "<i>No strings found</i>";
    }
}

function copyAll() {
    if(extractedStrings.length === 0) return;
    const text = extractedStrings.join('\n');
    navigator.clipboard.writeText(text).then(() => {
        alert("All strings copied to clipboard!");
    });
}
