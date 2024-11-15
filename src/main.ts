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
const cacheSpawnRate = 0.1;
const luckModifier: string = "test!";

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

//Draw Map
function drawMap(curLocation: leaflet.latLng) {
  cacheGroup.clearLayers();
  map.panTo(curLocation);
  playerLocation.setLatLng(curLocation);
  board.getCellForPoint(curLocation);
  const nearbyCells = board.getCellsNearPoint(curLocation);
  nearbyCells.forEach((cell) => {
    if (luck([cell.i, cell.j, luckModifier].toString()) < cacheSpawnRate) {
      makeCache(cell.i, cell.j);
    }
  });
}
//Initial Cache Generation
const currentPoint = startingPoint;
drawMap(currentPoint);

//Player Movement
const controlPanel = document.querySelector<HTMLDivElement>("#controlPanel")!;
const upArrow = document.createElement("button");
upArrow.innerHTML = "⬆️";
upArrow.addEventListener("click", () => {
  currentPoint.lat += CELL_GRANULARITY;
  drawMap(currentPoint);
});
controlPanel.append(upArrow);
