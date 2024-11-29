import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";
import "./leafletWorkaround.ts";
import luck from "./luck.ts";
import { Board } from "./board.ts";

//Settings
const CELL_GRANULARITY = 1e-4;
const startingPoint = leaflet.latLng(36.989525, -122.062760);
const zoom = 19;
const tileWidth = 10;
const cacheSpawnRadius = 8;
let geolocation: boolean = false;


//Button Creater
function CreateButton(
  text: string,
  clickHandler: () => void,
): HTMLButtonElement {
  const button = document.createElement("button");
  button.innerHTML = text;
  button.addEventListener("click", clickHandler);
  return button;
}

//Initialize Board
const board = new Board(tileWidth, cacheSpawnRadius);

//Intialize Map
const map = leaflet.map(document.getElementById("map")!, {
  center: startingPoint,
  zoom: zoom,
  minZoom: zoom,
  maxZoom: zoom,
  zoomControl: false,
  scrollWheelZoom: false,
});
leaflet.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
}).addTo(map);
const cacheGroup = leaflet.layerGroup();
cacheGroup.addTo(map);

//Intialize Player
const playerLocation = leaflet.marker(startingPoint);
playerLocation.bindTooltip("Current Location");
playerLocation.addTo(map);

const playerCoins: Coin[] = [];
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
const inventoryPanel = document.querySelector<HTMLDivElement>("#inventory")!;
inventoryPanel.innerHTML = "Inventory: <ul id='inventoryList'></ul>";
statusPanel.innerHTML = "0 Coins";

//Cache coin object
interface Coin {
  i: number;
  j: number;
  serial: number;
}

//Inventory updater
function updateInventory() {
  const inventoryList = document.querySelector<HTMLUListElement>(
    "#inventoryList",
  )!;
  inventoryList.innerHTML = ""; // Clear current inventory

  playerCoins.forEach((coin) => {
    const listItem = document.createElement("li");
    listItem.textContent = `${coin.i}:${coin.j}#${coin.serial}`; // Use compact representation
    inventoryList.appendChild(listItem);
  });
}

//Cache Coin Helper
const coinMap = new Map<string, Coin[]>();

//Cache Generation Helper
function makeCache(i: number, j: number) {
  board.getCellForPoint({ i, j });
  const possibleCache = leaflet.rectangle(
    leaflet.latLngBounds(board.getCellBounds({ i, j })),
  );
  cacheGroup.addLayer(possibleCache);

  possibleCache.bindPopup(() => {
    let cachedCoins: Coin[] = [];
    if (coinMap.has(`${i},${j}`)) {
      cachedCoins = coinMap.get(`${i},${j}`)!;
    } else {
      for (let n = Math.floor(luck([i, j].toString()) * 100); n > 0; n--) {
        cachedCoins.push({ i: i, j: j, serial: n });
      }
      coinMap.set(`${i},${j}`, cachedCoins);
    }
    const popupText: HTMLDivElement = document.createElement("div");
    popupText.innerHTML =
      `<div> Cache at ${i}, ${j}. Cache contains <span id="value">${cachedCoins.length}</span> available coins.</div>
    <button id="take">Take</button> <button id="place">Place</button>`;
    popupText.querySelector("#take")!.addEventListener("click", () => {
      if (cachedCoins.length > 0) {
        const tmp = cachedCoins.pop();
        coinMap.set(`${i},${j}`, cachedCoins);
        popupText.querySelector<HTMLSpanElement>("#value")!.innerHTML =
          cachedCoins.length.toString();
        playerCoins.push(tmp!);
        statusPanel.innerHTML = `${playerCoins.length} coins accumulated`;
        updateInventory();
      }
    });

    popupText.querySelector("#place")!.addEventListener("click", () => {
      if (playerCoins.length > 0) {
        const tmp = playerCoins.pop();
        cachedCoins.push(tmp!);
        coinMap.set(`${i},${j}`, cachedCoins);
        popupText.querySelector<HTMLSpanElement>("#value")!.innerHTML =
          cachedCoins.length.toString();
        statusPanel.innerHTML = `${playerCoins.length} Coins accumulated`;
        updateInventory();
      }
    });
    return popupText;
  });
}

//Polyline helper initialization
const polyLines: leaflet.latLng[][] = [];
const polyLineGroup = leaflet.layerGroup().addTo(map);
let _polyline: leaflet.Polyline;
function pushToPolyLine() {
  const tmp = leaflet.latLng(currentPoint.lat, currentPoint.lng);
  polyLines[polyLines.length - 1].push(tmp);
}

//Draw Map
function drawMap(curLocation: leaflet.latLng) {
  cacheGroup.clearLayers();
  polyLineGroup.clearLayers();
  map.panTo(curLocation);
  playerLocation.setLatLng(curLocation);
  board.getCellForPoint(curLocation);
  const nearbyCaches = board.getCachesNearPoint(curLocation);
  nearbyCaches.forEach((cell)=> {
    makeCache(cell.i,cell.j);
  })
  polyLines.forEach((line) => {
    if (line.length > 1) {
      _polyline = leaflet.polyline(line, { color: "red" }).addTo(polyLineGroup);
    }
  });
}

//Initial Cache Generation
const currentPoint = startingPoint;
polyLines.push([]);
pushToPolyLine();
drawMap(currentPoint);

//Player Movement
const controlPanel = document.querySelector<HTMLDivElement>("#controlPanel")!;
const upArrow = CreateButton("⬆️", () => {
  currentPoint.lat += CELL_GRANULARITY;
  pushToPolyLine();
  drawMap(currentPoint);
});
const downArrow = CreateButton("⬇️", () => {
  currentPoint.lat -= CELL_GRANULARITY;
  pushToPolyLine();
  drawMap(currentPoint);
});
const leftArrow = CreateButton("⬅️", () => {
  currentPoint.lng -= CELL_GRANULARITY;
  pushToPolyLine();
  drawMap(currentPoint);
});
const rightArrow = CreateButton("➡️", () => {
  currentPoint.lng += CELL_GRANULARITY;
  pushToPolyLine();
  drawMap(currentPoint);
});
controlPanel.append(upArrow);
controlPanel.append(downArrow);
controlPanel.append(leftArrow);
controlPanel.append(rightArrow);

//Auto Move
const autoMove = CreateButton("🌐", () => {
  if (!geolocation) {
    geolocation = true;
    polyLines.push([]);
    map.locate({
      setView: true,
      maxZoom: zoom,
      watch: true,
    });
  } else {
    map.stopLocate();
    polyLines.push([]);
    pushToPolyLine();
    geolocation = false;
  }
  console.log(geolocation);
});
controlPanel.append(autoMove);

map.on("locationfound", (e: leaflet.LocationEvent) => {
  if (geolocation) {
    currentPoint.lat = e.latlng.lat;
    currentPoint.lng = e.latlng.lng;
    pushToPolyLine();
    drawMap(currentPoint);
  }
});

//Reset Map
const trashButton = CreateButton("🚮", () => {
  if (prompt("Type yes to reset the game") == "yes") {
    coinMap.clear();
    playerCoins.length = 0;
    updateInventory();
    statusPanel.innerHTML = `${playerCoins.length} coins accumulated`;
    polyLines.length = 1;
    polyLines[0] = [];
    drawMap(currentPoint);
  }
});
controlPanel.append(trashButton);

//Save state

function saveState() {
  const arrayCoinMap = Array.from(coinMap);
  const state = {
    currentPoint: { lat: currentPoint.lat, lng: currentPoint.lng },
    playerCoins: playerCoins,
    coinMap: arrayCoinMap,
    polyLines: polyLines,
  };
  localStorage.setItem("state", JSON.stringify(state));
  console.log("saved");
}

function loadState() {
  const prevState = localStorage.getItem("state");
  if (prevState) {
    console.log("asda");
    const loadState = JSON.parse(prevState);
    currentPoint.lat = loadState.currentPoint.lat;
    currentPoint.lng = loadState.currentPoint.lng;
    drawMap(currentPoint);
  }
}

const saveButton = CreateButton("💾", saveState);
const loadButton = CreateButton("🔄", loadState);
controlPanel.append(saveButton);
controlPanel.append(loadButton);
