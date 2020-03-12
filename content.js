
$(document).ready(function () {
    setTimeout(function() {
        let extDiv = document.createElement('div');
        extDiv.setAttribute('id', "extplugin")
        $('body').append(extDiv);
        $('#extplugin').load(chrome.extension.getURL("index.html"));
    }, 3000)
});