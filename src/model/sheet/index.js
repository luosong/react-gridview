import {Record, Map, Range, List}from "immutable";
import ColumnHeaderModel from "./column-header";
import RowHeaderModel from "./row-header";
import {CellPoint, BORDER_POSITION} from "../common";
import CellModel from "./cell";
import ScrollModel from "./scroll";
import Border from "./border";
import {OBJECT_TYPE} from "./object-type";

const emptyCell = new CellModel();
const emptyBorder = new Border();
export {
  OBJECT_TYPE
};

// テーブルに参照ポイントの適用を行う
function refsApply(table, prevCell, nextCell){
  // 参照セルの値を更新

  prevCell.refs.forEach((ref) =>{
    if (table.has(ref)){
      const cell = table.get(ref).deleteChildId(prevCell.toId());
      table = table.set(ref, cell);
    }
  });

  nextCell.refs.forEach((ref) =>{
    if (table.has(ref)){
      const cell = table.get(ref).addChildId(nextCell.toId());
      table = table.set(ref, cell);
    }
  });

  return table;

}

// JSONからテーブル情報を生成
function JsonToTable(json){
  let table = Map();

  if (!json){
    return table;
  }
  for(var key in json){
    const cell = CellModel.fromJson(json[key]);
    table = table.set(key, cell);
  }
  return table;
}

/**
 * 表示情報
 */
export default class Sheet extends Record({
  columnHeader: new ColumnHeaderModel(),
  rowHeader: new RowHeaderModel(),
  table: Map(),
  stickies: List(),
  borders: Map(),
  scroll: new ScrollModel(),
  zoom: 100,
  onChangeCell: (prevCell, nextCell) => {
    return nextCell;
  }
}) {

  static createClass(){
    return new Sheet();
  }

  // JSONから本クラスを生成
  static fromJson(json){
    const sheet = new Sheet();
    // テーブル情報を変換
    return sheet
      .set("table", JsonToTable(json.table))
      .setColumnHeader(ColumnHeaderModel.fromJson(json.columnHeader))
      .setRowHeader(RowHeaderModel.fromJson(json.rowHeader));
  }

  // 本クラスをJSONへ変換
  toJson(){
    return this.toJS();
  }

  setColumnHeader(columnHeader){
    return this.set("columnHeader", columnHeader);
  }

  setRowHeader(rowHeader){
    return this.set("rowHeader", rowHeader);
  }

  setZoom(zoom){
    return this.set("zoom", zoom);
  }

  editRowHeader(mutator){
    return this.set("rowHeader", mutator(this.rowHeader));
  }

  editColumnHeader(mutator){
    return this.set("columnHeader", mutator(this.columnHeader));
  }

  getCell(target){

    const id = (typeof target === "string") ? target : target.toId();
    const cellPoint = (typeof target === "string") ? CellPoint.createForId(id) : target;
    if (this.table.has(id) === false){
      return CellModel.createCell(cellPoint);
    }

    return this.table.get(id);
  }


  setOnChangeCell(onChangeCell){
    return this.set("onChangeCell", onChangeCell);
  }

  getValueForId(id){
    if (this.table.has(id) === false){
      return "";
    }
    return this.table.get(id).value;
  }

  // 値のセット
  setValue(cellPoint, value){
    const nextCell = this.getCell(cellPoint).setValue(value);
    return this.setCell(cellPoint, nextCell);
  }

  setCell(cellPoint, nextCell){
    const prevCell = this.getCell(cellPoint);
    nextCell = nextCell.solveCalc(this);
    let cell = this.onChangeCell(prevCell, nextCell);
    if (cell === prevCell){
      return this;
    }
    let table = emptyCell.equals(cell) ?
      this.table.delete(cellPoint.toId()) :
      this.table.set(cellPoint.toId(), cell);

    // 参照セルの値を更新
    table = refsApply(table, prevCell, cell);

    let sheet = this.set("table", table);
    if(cell.text !== prevCell){
      cell.childIds.forEach(id=>{
        const childCell = sheet.table.get(id);
        sheet = sheet.set("table", sheet.table.set(id, childCell.solveCalc(sheet)));
      });
    }

    return sheet;
  }

  get defaultBorder(){
    return emptyBorder;
  }

  get scale(){
    // デバイスのピクセル比を取得する
    var dpr = (window && window.devicePixelRatio) || 1;
    return this.zoom / 100 * dpr || 1;
  }
  // 枠線取得
  getBorder(cellPoint, borderPosition){
    const id = cellPoint.toId() + "-" + borderPosition;
    if (this.borders.has(id) === false){
      return this.defaultBorder;
    }

    return this.borders.get(id);
  }

  // 枠線設定
  setBorder(cellPoint, borderPosition, border){
    if(!cellPoint){
      return this;
    }

    if(borderPosition === BORDER_POSITION.RIGHT){
      cellPoint = cellPoint.setColumnNo(cellPoint.columnNo + 1);
      borderPosition = BORDER_POSITION.LEFT;
    }

    if(borderPosition === BORDER_POSITION.BOTTOM){
      cellPoint = cellPoint.setRowNo(cellPoint.rowNo + 1);
      borderPosition = BORDER_POSITION.TOP;
    }

    const id = cellPoint.toId() + "-" + borderPosition;
    if(!border){
      if (this.borders.has(id)){
        return this.set("borders", this.borders.delete(id));
      }
      else{
        return this;
      }
    }

    const prevBorder = this.getBorder(cellPoint, borderPosition);
    if (prevBorder.equals(border)){
      return this;
    }

    return this.set("borders", this.borders.set(id, border));
  }

  editCell(cellPoint, mutator){
    const prevCell = this.getCell(cellPoint);
    const nextCell = mutator(prevCell);
    return this.setCell(cellPoint, nextCell);
  }

  // 範囲内のセルを変更する
  editCells(range, mutator){
    if(!range){
      return this;
    }
    const left = Math.min(range.cellPoint1.columnNo, range.cellPoint2.columnNo);
    const right = Math.max(range.cellPoint1.columnNo, range.cellPoint2.columnNo);
    const top = Math.min(range.cellPoint1.rowNo, range.cellPoint2.rowNo);
    const bottom = Math.max(range.cellPoint1.rowNo, range.cellPoint2.rowNo);

    let model = this;
    Range(left, right + 1).forEach((columnNo)=>{
      Range(top, bottom + 1).forEach((rowNo)=>{
        const cellPoint = new CellPoint(columnNo, rowNo);
        const prevCell = this.getCell(cellPoint);
        const nextCell = mutator(prevCell);
        model = model.setCell(cellPoint, nextCell);
        //model = model.setValue(new CellPoint(columnNo, rowNo), value);
      });
    });

    return model;
  }

  getCells(range){
    if(!range){
      return this;
    }
    const left = Math.min(range.cellPoint1.columnNo, range.cellPoint2.columnNo);
    const right = Math.max(range.cellPoint1.columnNo, range.cellPoint2.columnNo);
    const top = Math.min(range.cellPoint1.rowNo, range.cellPoint2.rowNo);
    const bottom = Math.max(range.cellPoint1.rowNo, range.cellPoint2.rowNo);

    let cells = List();

    Range(left, right + 1).forEach((columnNo)=>{
      Range(top, bottom + 1).forEach((rowNo)=>{
        const cellPoint = new CellPoint(columnNo, rowNo);
        cells = cells.push(this.getCell(cellPoint));
      });
    });

    return cells;
  }

  addSticky(sticky){
    return this.set("stickies", this.stickies.push(sticky));
  }

  deleteSticky(index){
    return this.set("stickies", this.stickies.delete(index));
  }

  // 範囲内のセルを取得する
  setValueRange(range, value){
    if(!range){
      return this;
    }
    const left = Math.min(range.cellPoint1.columnNo, range.cellPoint2.columnNo);
    const right = Math.max(range.cellPoint1.columnNo, range.cellPoint2.columnNo);
    const top = Math.min(range.cellPoint1.rowNo, range.cellPoint2.rowNo);
    const bottom = Math.max(range.cellPoint1.rowNo, range.cellPoint2.rowNo);

    let model = this;
    Range(left, right + 1).forEach((columnNo)=>{
      Range(top, bottom + 1).forEach((rowNo)=>{
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
  setValueRanges(ranges, value){
    if(!ranges){
      return this;
    }

    let model = this;

    ranges.forEach(range =>{
      model = model.setValueRange(range, value);
    });
    return model;
  }


  // 絶対座標の列情報を探す(二分探索)
  pointToColumnNo(pointX, firstIndex, lastIndex){

    if ((!firstIndex) && (lastIndex !== 0)){
      firstIndex = 1;
    }

    if ((!lastIndex) && (lastIndex !== 0)){
      lastIndex = this.columnHeader.maxCount;
    }

    // 上限下限が逆転してしまったら、範囲外にはもう無い
    if (firstIndex > lastIndex){
      return 0;
    }

    // 一区画あたりのセル数（切り上げ）
    const targetIndex = Math.ceil((firstIndex + lastIndex) / 2);
    const cellPoint = this.columnHeader.items.get(targetIndex);

    // ターゲットがもっと左側にある
    if (pointX < cellPoint.left){
      return this.pointToColumnNo(pointX, firstIndex, targetIndex - 1);
    }

    // ターゲットがもっと右側にある
    if (pointX >= cellPoint.right){
      return this.pointToColumnNo(pointX, targetIndex + 1, lastIndex);
    }

    // 発見
    return targetIndex;
  }

  // Ｙ座標から、行番号を算出する
  pointToRowNo(pointY, firstIndex, lastIndex){

    if ((!firstIndex) && (lastIndex !== 0)){
      firstIndex = 1;
    }

    if ((!lastIndex) && (lastIndex !== 0)){
      lastIndex = this.rowHeader.maxCount;
    }

    // 左右が逆転してしまったら、範囲外にはもう無い
    if (firstIndex > lastIndex){
      return 0;
    }

    // 一区画あたりのセル数（切り上げ）
    const targetIndex = Math.ceil((firstIndex + lastIndex) / 2);
    const cellPoint = this.rowHeader.items.get(targetIndex);

    // ターゲットがもっと上側にある
    if (pointY < cellPoint.top){
      return this.pointToRowNo(pointY, firstIndex, targetIndex - 1);
    }

    // ターゲットがもっと下側にある
    if (pointY >= cellPoint.bottom){
      return this.pointToRowNo(pointY, targetIndex + 1, lastIndex);
    }

    // 発見
    return targetIndex;
  }

  // 座標からセル位置を取得する
  pointToTarget(pointX, pointY){
    const columnNo = this.pointToColumnNo(pointX);
    const rowNo = this.pointToRowNo(pointY);

    return new CellPoint(columnNo, rowNo);
  }

}