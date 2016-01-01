import {Record} from "immutable";
import Cell from "./cell";
import {VERTICAL_ALIGN, TEXT_ALIGN} from "../common";
import toMinJS from "../lib/to-min-js";

const emptyCell = new Cell();
const defCell = emptyCell
    .setVerticalAlign(VERTICAL_ALIGN.MIDDLE)
    .setTextAlign(TEXT_ALIGN.CENTER);

export default class ColumnHeaderItem extends Record({
    cell: defCell,
    width: 80,
    left: 0
}) {
    cell: Cell;
    width: number;
    left: number;

    static create() {
        return new ColumnHeaderItem();
    }

    // JSONから本クラスを生成
    static fromJS(json) {
        //const item = new ColumnHeaderItem();
        return ColumnHeaderItem.create()
            .setCell(Cell.fromJS(json.cell))
            .setWidth(json.width);
    }

    toMinJS(columnHeaderItem) {
        return toMinJS(this, columnHeaderItem, ColumnHeaderItem);
    }

    setCell(cell: Cell): this {
        return <this>this.set("cell", cell);
    }

    setWidth(width): this {
        return <this>this.set("width", width);
    }

    setValue(value): this {
        const cell = this.cell.setValue(value);
        return this.setCell(cell);
    }

    setLeft(left): this {
        return <this>this.set("left", left);
    }

    get right() {
        return this.left + this.width;
    }

    setBackground(background): this {
        const cell = this.cell.setBackground(background);
        return this.setCell(cell);
    }
}