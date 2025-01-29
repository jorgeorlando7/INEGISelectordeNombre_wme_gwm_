// ==UserScript==
// @name         INEGI Selector de Nombre
// @name:es      INEGI Select name
// @description  Al ingresar al GAIA y dar click a una calle te seleccionara el nombre en automático, copiara al portapapeles y desactivara la capa de Servicios.
// @description:es Al ingresar al GAIA y dar click a una calle te seleccionara el nombre en automático, copiara al portapapeles y desactivara la capa de Servicios.
// @author       GWM_
// @namespace https://greasyfork.org/es/users/1362250-gwm
// @version      1.2
// @match        https://gaia.inegi.org.mx/mdm6/*
// @grant        none
// @license      GPLv3
// @downloadURL none
// ==/UserScript==

var _debugLevel = 0;

function log(message, level) {
    if (message && level <= _debugLevel) {
        console.log('GTB4WE: ' + message);
    }
}

// Función para decodificar la parte Base64
function decodeBase64(encoded) {
    return atob(encoded);
}

// Función para codificar en Base64
function encodeBase64(input) {
    return btoa(input);
}

//> Executes a callback if is valid, if not, it tries again after a time
function bootstrap(valid, callback, tries) {
    tries = tries || 1;
    log("bootstrap " + tries, 3);
    if (valid()) {
        callback();
    } else if (tries < 250) {
        setTimeout(function () { bootstrap(valid, callback, tries + 1); }, 200);
    }
}

function init() {
    log("init", 1);
    $.fn.exists = function () {
        return this.length !== 0;
    };

    bootstrap(
        function () { return $("#mdm6DinamicPanel").exists(); },
        initStreetNameObserver
    );
    bootstrap(
        function () { return $("#mdmToolBar").exists() && $("#mdmToolBar")[0].childNodes.length > 0; },
        function () {
            createLink();
            //createHideButton();
        }
    );
    console.log("Gaia ToolBox for Waze Editors (GTB4WE) " + GM_info.script.version + " is running.");
}

// Función para activar las capas necesarias
function activateLayers(url) {
    // Obtener la parte 'v=' de la URL
    let params = new URLSearchParams(window.location.search);
    let vParam = params.get('v');

    if (!vParam) return;  // Si no existe parámetro v, salir.

    // Decodificar la parte Base64
    let decodedV = decodeBase64(vParam);

    // Verificar si ya contiene capas
    if (decodedV.includes('l:c112')) {
        console.log('Las capas ya están activadas.');
        return;
    }

    // Si no contiene las capas, agregarlas
    let newLayers = ',l:c112|tc112|tt700';
    if (!decodedV.includes(',l:')) {
        // Si no existe 'l:', agregar las capas al final
        decodedV += newLayers;
    } else {
        // Si ya existe 'l:', reemplazar o añadir las nuevas capas
        decodedV = decodedV.replace(/,l:[^,]*/, newLayers);
    }

    // Codificar de nuevo en Base64
    let newVParam = encodeBase64(decodedV);

    // Crear la nueva URL con las capas activadas
    let newUrl = window.location.origin + window.location.pathname + '?v=' + newVParam;

    // Redirigir a la nueva URL
    window.location.href = newUrl;
}

// Función para inicializar el observador de nombres de calle
function initStreetNameObserver() {
    log("initStreetNameObserver", 1);
    var observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            if ($(mutation.target).hasClass("dinamicPanel-detail")) {
                selectStreetName();
            }
        });
    });
    observer.observe($("#mdm6DinamicPanel")[0], {
        childList: true,
        subtree: true
    });
}

// Función para seleccionar el nombre de la calle
function selectStreetName() {
    var elements = $(".dinamicPanel-detailMainLabel");
    if (elements.length === 0 || elements[0].childNodes.length === 0) return;
    var sel = window.getSelection();
    if (!sel.isCollapsed) return;
    log("selecting street.", 3);
    var range = document.createRange();
    elements[0].childNodes.forEach(function (child) {
        if (child.nodeName == "#text") {
            range.selectNodeContents(child);
            return;
        } else if (child.nodeName == "TABLE") {
            range.selectNodeContents(child.childNodes[0].childNodes[0].childNodes[1]);
            return;
        }
    });
    sel.removeAllRanges();
    sel.addRange(range);

    // Copy the selected text to the clipboard
    var text = range.toString();
    navigator.clipboard.writeText(text).then(function() {
        log("Street name copied to clipboard.", 3);
    }).catch(function(error) {
        log("Error copying street name to clipboard: " + error, 3);
    });
}

//> Creates a button to go to WME
function createLink() {
    log("createLink", 1);
    var $link = $("<div id='toWaze' class='custom-toolBar-btn' title='Ir a WME'><img src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAnFBMVEX///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAGBgYkJCQPDw8AAAAAAAAAAAARERGHh4ff39/////v7++bm5ssLCy/v78dHR0AAAAAAABAQEBjY2NTU1MvLy8AAACLi4sAAACPj4/Pz89eXl4vLy9fX18PDw+vr69vb28AAAA/Pz+fn59/f39PT08fHx8fHx9PT093d3cAAACsrKw9PT2OeT7UAAAANHRSTlMAMJDQ/+CgUPbg7nAQsPDu////9uj/6/Bg6+vt60D3IP//5P//////wP///+j/7f/wgPXnWPjZAAAAAVBJREFUeAGVkwVyxDAQBA1thngVhmNm+v/fUluW6zjQB4ZpseSc4no+ShBGzg2iAIiTJEnVyS7jvIDyoRLFPD6B757XHlA+ypHnF17fTvNX3o2c8QFHIw/4lEseeXUbIeRLrvnAt3mL2MgNXrBjKWjLLZ4JHKVDLDWmK5ZeT/+fiFTI6Nt8wNDmo5Eaj4R1F8ciSjViYESZwERL1G1MMU3Fs+ZuWFeVosIrco8EFfiHYKShuinMR1XTh4EosQo5qVgWzSjmjPSm0snu+CzFYgasxiLVEOb6/IDnBLA2cjRQGM1FKXEdLtZhvlkxm1R2wQOdpa3cwZS6FC705DbvTHWQO+LbxidBbrdTvBdzAJbmGJuv444L4X2Nctx47Rg/Px6ZVyxjDc24H0OheUPuc4V28Mj0NyFDQcfdoiY7psc2psfaXvPrs0uY623uqdoM8RsjPzADs0ZfiwAAAABJRU5ErkJggg==' width='24px' height='24px'></div>");
    $("#mdmToolBar").append($link);
    $link[0].onclick = go2WME;
}

//> Extracts coords for current position and opens a new waze map editor window
function go2WME() {
    var params = atob(window.location.href.slice(window.location.href.indexOf('=') + 1)).split(',');
    params.forEach(function (value, i, array) {
        if (value.includes("lat") || value.includes("lon")) {
            array[i] = value.replace(":", "=");
        } else if (value.includes("z")) {
            //> mdm zoom minus 8 units corresponding to wme zoom
            var z = parseInt(value.slice(value.indexOf(":") + 1)) - 8;
            if (z < 0) z = 0;
            if (z > 10) z = 10;
            array[i] = "zoom=" + z;
        } else {
            array.splice(i, 1);
        }
    });
    log("params " + params, 3);
    window.open("https://www.waze.com/editor/?" + params.join("&"));
}

// Ejecutar la función de activar capas al cargar la página
activateLayers(window.location.href);

//> Creates a button to hide header info
function createHideButton() {
    log("createHideButton", 1);
    var $link = $("<div id='hideTop' class='custom-toolBar-btn' title='Ocultar cabecera'><img src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAnFBMVEX///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAGBgYkJCQPDw8AAAAAAAAAAAARERGHh4ff39/////v7++bm5ssLCy/v78dHR0AAAAAAABAQEBjY2NTU1MvLy8AAACLi4sAAACPj4/Pz89eXl4vLy9fX18PDw+vr69vb28AAAA/Pz+fn59/f39PT08fHx8fHx9PT093d3cAAACsrKw9PT2OeT7UAAAANHRSTlMAMJDQ/+CgUPbg7nAQsPDu////9uj/6/Bg6+vt60D3IP//5P//////wP///+j/7f/wgPXnWPjZAAAAAVBJREFUeAGVkwVyxDAQBA1thngVhmNm+v/fUluW6zjQB4ZpseSc4no+ShBGzg2iAIiTJEnVyS7jvIDyoRLFPD6B757XHlA+ypHnF17fTvNX3o2c8QFHIw/4lEseeXUbIeRLrvnAt3mL2MgNXrBjKWjLLZ4JHKVDLDWmK5ZeT/+fiFTI6Nt8wNDmo5Eaj4R1F8ciSjViYESZwERL1G1MMU3Fs+ZuWFeVosIrco8EFfiHYKShuinMR1XTh4EosQo5qVgWzSjmjPSm0snu+CzFYgasxiLVEOb6/IDnBLA2cjRQGM1FKXEdLtZhvlkxm1R2wQOdpa3cwZS6FC705DbvTHWQO+LbxidBbrdTvBdzAJbmGJuv444L4X2Nctx47Rg/Px6ZVyxjDc24H0OheUPuc4V28Mj0NyFDQcfdoiY7psc2psfaXvPrs0uY623uqdoM8RsjPzADs0ZfiwAAAABJRU5ErkJggg==' width='24px' height='24px'></div>");
    $("#mdmToolBar").append($link);
    $link[0].onclick = function () {
        $("#mdm6Header").toggle();
        $("#mdm6DinamicPanel").toggleClass("large");
    };
}

// Ejecutar la función al cargar la página
init();
