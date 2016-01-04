import {Record, Map, Range, List}from "immutable";
import ColumnHeader from "./column-header";
import RowHeader from "./row-header";
import {CellPoint, CellRange, BORDER_POSITION} from "../common";
import Cell from "./cell";
import Scroll from "./scroll";
import Border from "./border";
import {OBJECT_TYPE} from "./object-type";
import {Sticky} from "./sticky";

const emptyCell = new Cell();
const emptyBorder = new Border();
export {
OBJECT_TYPE
};

// テーブルに参照ポイントの適用を行う
function refsApply(table: Map<string, Cell>, prevCell: Cell, nextCell: Cell) {
    // 参照セルの値を更新

    prevCell.refs.forEach((ref) => {
        if (table.has(ref)) {
            const cell = table.get(ref).deleteChildId(prevCell.toId());
            table = table.set(ref, cell);
        }
    });

    nextCell.refs.forEach((ref) => {
        if (table.has(ref)) {
            const cell = table.get(ref).addChildId(nextCell.toId());
            table = table.set(ref, cell);
        }
    });

    return table;

}

// JSONからテーブル情報を生成
function JsonToTable(json) {
    let table = <Map<string, Cell>>Map();

    if (!json) {
        return table;
    }
    for (var key in json) {
        const cell = Cell.fromJS(json[key]);
        table = table.set(key, cell);
    }
    return table;
}

function JsonToBorders(json) {
    let borders = <Map<string, Border>>Map();

    if (!json) {
        return borders;
    }

    for (var key in json) {
        const border = Border.fromJS(json[key]);
        borders = borders.set(key, border);
    }

    return borders;
}

/**
 * 表示情報
 */
export class Sheet extends Record({
    columnHeader: new ColumnHeader(),
    rowHeader: new RowHeader(),
    table: Map(),
    stickies: List(),
    borders: Map(),
    scroll: new Scroll(),
    zoom: 100,
    onChangeCell: (prevCell: Cell, nextCell: Cell) => {
        return nextCell;
    }
}) {

    columnHeader: ColumnHeader;
    rowHeader: RowHeader;
    table: Map<string, Cell>;
    stickies: any;
    borders: Map<string, Border>;
    //scroll: Scroll;
    zoom: number;
    onChangeCell: (prev: Cell, nextCell: Cell) => Cell;

    static create() {
        return new Sheet();
    }

    static createClass() {
        return new Sheet();
    }

    // JSONから本クラスを生成
    static fromJS(json) {
        const sheet = new Sheet();
        const zoom = Number(json.zoom) || 100; 
        // テーブル情報を変換
        return sheet
            .setTable(JsonToTable(json.cells))
            .setBorders(JsonToBorders(json.borders))
            .setColumnHeader(ColumnHeader.fromJS(json.columnHeader))
            .setRowHeader(RowHeader.fromJS(json.rowHeader))
            .setZoom(zoom);
    }

    private tableToMinJS() {
        let json: any = {};
        this.table.forEach((item, key) => {
            const cell = item.toMinJS();
            if (Object.keys(cell).length) {
                json[key] = cell;
            }
        });
        return json;
    }

    private tableToJS() {
        let json: any = {};

        Range(1, this.columnHeader.columnCount + 1).forEach((columnNo) => {
            Range(1, this.rowHeader.rowCount + 1).forEach((rowNo) => {
                const cellPoint = new CellPoint(columnNo, rowNo);
                const key = cellPoint.toId();
                json[key] = this.getCell(cellPoint);
            });
        });
        return json;
    }

    private bordersToJS(isMin: boolean) {
        let json: any = {};
        this.borders.forEach((border, key) => {
            const bJson = border.toMinJS();
            if ((!isMin) || (Object.keys(bJson).length)) {
                json[key] = bJson;
            }
        })

        return json;
    }

    toMinJS() {
        let json: any = {};
        const addJson = (j, v, name) => {
            if (Object.keys(v).length) {
                j[name] = v;
            }
            return j;
        }

        json = addJson(json, this.columnHeader.toMinJS(), "columnHeader");
        json = addJson(json, this.rowHeader.toMinJS(), "rowHeader");
        json = addJson(json, this.bordersToJS(true), "borders");
        json = addJson(json, this.tableToMinJS(), "cells");
        if (this.zoom !== 100) {
            json["zoom"] = this.zoom;
        }
        return json;
    }


    // 本クラスをJSONへ変換
    toJS() {
        return {
            columnHeader: this.columnHeader.toJS(),
            rowHeader: this.rowHeader.toJS(),
            borders: this.bordersToJS(false),
            cells: this.tableToJS(),
            zoom: this.zoom
        };
    }

    setTable(table: Map<string, Cell>) {
        return <Sheet>this.set("table", table);
    }

    setColumnHeader(columnHeader: ColumnHeader) {
        return <Sheet>this.set("columnHeader", columnHeader);
    }

    setRowHeader(rowHeader: RowHeader) {
        return <Sheet>this.set("rowHeader", rowHeader);
    }

    setZoom(zoom: number) {
        return <Sheet>this.set("zoom", zoom);
    }

    editRowHeader(mutator: (rowHeader: RowHeader) => RowHeader) {
        return <Sheet>this.set("rowHeader", mutator(this.rowHeader));
    }

    editColumnHeader(mutator: (columnHeader: ColumnHeader) => ColumnHeader) {
        return <Sheet>this.set("columnHeader", mutator(this.columnHeader));
    }


    getCell(arg): Cell {
        //
        // const id = (typeof target === "string") ? target : target.toId();
        // const cellPoint = (typeof target === "string") ? CellPoint.createForId(id) : target;


        let id;
        let cellPoint;
        if (arguments.length === 1) {
            id = (typeof arguments[0] === "string") ? arguments[0] : arguments[0].toId();
            cellPoint = (typeof arguments[0] === "string") ? CellPoint.createForId(id) : arguments[0];
        }
        else {
            cellPoint = new CellPoint(arguments[0], arguments[1]);
            id = cellPoint.toId();
        }

        if (this.table.has(id) === false) {
            return Cell.create(cellPoint);
        }

        return this.table.get(id);
    }


    setOnChangeCell(onChangeCell: (prev: Cell, nextCell: Cell) => Cell) {
        return <Sheet>this.set("onChangeCell", onChangeCell);
    }

    getValueForId(id: string) {
        if (this.table.has(id) === false) {
            return "";
        }
        return this.table.get(id).value;
    }

    // 値のセット
    setValue(cellPoint: CellPoint, value) {
        const nextCell = this.getCell(cellPoint).setValue(value);
        return <Sheet>this.setCell(cellPoint, nextCell);
    }

    setCell(arg, arg2) {
        const cellPoint = (arguments.length === 2) ? arguments[0] : new CellPoint(arguments[0], arguments[1]);
        let nextCell = arguments[arguments.length - 1];
        const prevCell = this.getCell(cellPoint);
        nextCell = nextCell.solveCalc(this);
        let cell = this.onChangeCell(prevCell, nextCell);
        if (cell === prevCell) {
            return this;
        }
        let table = emptyCell.equals(cell) ?
            this.table.delete(cellPoint.toId()) :
            this.table.set(cellPoint.toId(), cell);

        // 参照セルの値を更新
        table = refsApply(table, prevCell, cell);

        let sheet = this.setTable(table);
        if (cell.text !== prevCell.text) {
            cell.childIds.forEach(id=> {
                const childCell = sheet.table.get(id);
                sheet = sheet.setTable(sheet.table.set(id, childCell.solveCalc(sheet)));
            });
        }

        return sheet;
    }

    get defaultBorder() {
        return emptyBorder;
    }

    get scale() {
        // デバイスのピクセル比を取得する
        // var dpr = (window && window.devicePixelRatio) || 1;
        // return this.zoom / 100 * dpr || 1;
        return this.zoom / 100 || 1;
    }
    // 枠線取得
    getBorder(cellPoint: CellPoint, borderPosition: BORDER_POSITION) {
        const id = cellPoint.toId() + "-" + borderPosition;
        if (this.borders.has(id) === false) {
            return this.defaultBorder;
        }

        return this.borders.get(id);
    }

    setBorders(borders: Map<string, Border>) {
        return <Sheet>this.set("borders", borders);
    }

    // 枠線設定
    setBorder(cellPoint: CellPoint, borderPosition: BORDER_POSITION, border: Border) {
        if (!cellPoint) {
            return this;
        }

        if (borderPosition === BORDER_POSITION.RIGHT) {
            cellPoint = cellPoint.setColumnNo(cellPoint.columnNo + 1);
            borderPosition = BORDER_POSITION.LEFT;
        }

        if (borderPosition === BORDER_POSITION.BOTTOM) {
            cellPoint = cellPoint.setRowNo(cellPoint.rowNo + 1);
            borderPosition = BORDER_POSITION.TOP;
        }

        const id = cellPoint.toId() + "-" + borderPosition;
        if (!border) {
            if (this.borders.has(id)) {
                return <Sheet>this.set("borders", this.borders.delete(id));
            }
            else {
                return this;
            }
        }

        const prevBorder = this.getBorder(cellPoint, borderPosition);
        if (prevBorder.equals(border)) {
            return this;
        }

        return <Sheet>this.set("borders", this.borders.set(id, border));
    }

    editCell(cellPoint: CellPoint, mutator: (cell: Cell) => Cell) {
        const prevCell = this.getCell(cellPoint);
        const nextCell = mutator(prevCell);
        return this.setCell(cellPoint, nextCell);
    }

    // 範囲内のセルを変更する
    editCells(range: CellRange, mutator: (cell: Cell) => Cell) {
        if (!range) {
            return this;
        }
        const left = Math.min(range.cellPoint1.columnNo, range.cellPoint2.columnNo);
        const right = Math.max(range.cellPoint1.columnNo, range.cellPoint2.columnNo);
        const top = Math.min(range.cellPoint1.rowNo, range.cellPoint2.rowNo);
        const bottom = Math.max(range.cellPoint1.rowNo, range.cellPoint2.rowNo);

        let model = <Sheet>this;
        Range(left, right + 1).forEach((columnNo) => {
            Range(top, bottom + 1).forEach((rowNo) => {
                const cellPoint = new CellPoint(columnNo, rowNo);
                const prevCell = this.getCell(cellPoint);
                const nextCell = mutator(prevCell);
                model = model.setCell(cellPoint, nextCell);
                //model = model.setValue(new CellPoint(columnNo, rowNo), value);
            });
        });

        return model;
    }

    getCells(range: CellRange): List<Cell> {
        if (!range) {
            return <List<Cell>>List();
        }
        const left = Math.min(range.cellPoint1.columnNo, range.cellPoint2.columnNo);
        const right = Math.max(range.cellPoint1.columnNo, range.cellPoint2.columnNo);
        const top = Math.min(range.cellPoint1.rowNo, range.cellPoint2.rowNo);
        const bottom = Math.max(range.cellPoint1.rowNo, range.cellPoint2.rowNo);

        let cells = <List<Cell>>List();

        Range(left, right + 1).forEach((columnNo) => {
            Range(top, bottom + 1).forEach((rowNo) => {
                const cellPoint = new CellPoint(columnNo, rowNo);
                cells = cells.push(this.getCell(cellPoint));
            });
        });

        return cells;
    }

    addSticky(sticky: Sticky) {
        return this.set("stickies", this.stickies.push(sticky));
    }

    deleteSticky(index: number) {
        return this.set("stickies", this.stickies.delete(index));
    }

    // 範囲内のセルを設定する
    setValueRange(range: CellRange, value) {
        if (!range) {
            return this;
        }
        const left = Math.min(range.cellPoint1.columnNo, range.cellPoint2.columnNo);
        const right = Math.max(range.cellPoint1.columnNo, range.cellPoint2.columnNo);
        const top = Math.min(range.cellPoint1.rowNo, range.cellPoint2.rowNo);
        const bottom = Math.max(range.cellPoint1.rowNo, range.cellPoint2.rowNo);

        let model = <Sheet>this;
        Range(left, right + 1).forEach((columnNo) => {
            Range(top, bottom + 1).forEach((rowNo) => {
                model = model.setValue(new CellPoint(columnNo, rowNo), value);
            });
        });

        return model;

    }

    /**
     * 複数範囲の値を変更する
     * @param {List} ranges 範囲リスト
     * @param {string} value  変更値
     */
    setValueRanges(ranges: List<CellRange>, value) {
        if (!ranges) {
            return this;
        }

        let model = <Sheet>this;

        ranges.forEach(range => {
            model = model.setValueRange(range, value);
        });
        return model;
    }


    // 絶対座標の列情報を探す(二分探索)
    pointToColumnNo(pointX: number, firstIndex?: number, lastIndex?: number) {

        if ((!firstIndex) && (lastIndex !== 0)) {
            firstIndex = 1;
        }

        if ((!lastIndex) && (lastIndex !== 0)) {
            lastIndex = this.columnHeader.columnCount;
        }

        // 上限下限が逆転してしまったら、範囲外にはもう無い
        if (firstIndex > lastIndex) {
            return 0;
        }

        // 一区画あたりのセル数（切り上げ）
        const targetIndex = Math.ceil((firstIndex + lastIndex) / 2);
        const cellPoint = this.columnHeader.items.get(targetIndex);

        // ターゲットがもっと左側にある
        if (pointX < cellPoint.left) {
            return this.pointToColumnNo(pointX, firstIndex, targetIndex - 1);
        }

        // ターゲットがもっと右側にある
        if (pointX >= cellPoint.right) {
            return this.pointToColumnNo(pointX, targetIndex + 1, lastIndex);
        }

        // 発見
        return targetIndex;
    }

    // Ｙ座標から、行番号を算出する
    pointToRowNo(pointY: number, firstIndex?: number, lastIndex?: number) {

        if ((!firstIndex) && (lastIndex !== 0)) {
            firstIndex = 1;
        }

        if ((!lastIndex) && (lastIndex !== 0)) {
            lastIndex = this.rowHeader.rowCount;
        }

        // 左右が逆転してしまったら、範囲外にはもう無い
        if (firstIndex > lastIndex) {
            return 0;
        }

        // 一区画あたりのセル数（切り上げ）
        const targetIndex = Math.ceil((firstIndex + lastIndex) / 2);
        const cellPoint = this.rowHeader.items.get(targetIndex);

        // ターゲットがもっと上側にある
        if (pointY < cellPoint.top) {
            return this.pointToRowNo(pointY, firstIndex, targetIndex - 1);
        }

        // ターゲットがもっと下側にある
        if (pointY >= cellPoint.bottom) {
            return this.pointToRowNo(pointY, targetIndex + 1, lastIndex);
        }

        // 発見
        return targetIndex;
    }

    // 座標からセル位置を取得する
    pointToTarget(pointX: number, pointY: number) {
        const columnNo = this.pointToColumnNo(pointX);
        const rowNo = this.pointToRowNo(pointY);
        return new CellPoint(columnNo, rowNo);
    }
}

export {
Sheet as default
}