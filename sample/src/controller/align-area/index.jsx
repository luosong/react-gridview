import React from "react";

import SimpleButton from "../common/simple-button";

import {Sheet, Operation, TEXT_ALIGN} from "react-gridview";

import "./index.css";

import AlignLeftIcon from "./align-left.png";
import AlignCenterIcon from "./align-center.png";
import AlignRightIcon from "./align-right.png";

const AlignArea = React.createClass({
  displayName: "AlignArea",
  propTypes: {
    viewModel: React.PropTypes.instanceOf(Sheet),
    operation: React.PropTypes.instanceOf(Operation),
    onControlView: React.PropTypes.func
  },
  _onChangeTextAlign(textAlign){
    const rangeItem = this.props.operation.rangeItem;

    const view = this.props.viewModel.editCells(
      rangeItem, (cell)=>{
        return cell.setTextAlign(textAlign);
      });

    this.props.onControlView(view);

  },
  _onClickLeft(){
    this._onChangeTextAlign(TEXT_ALIGN.LEFT);
  },
  _onClickCenter(){
    this._onChangeTextAlign(TEXT_ALIGN.CENTER);
  },
  _onClickRight(){
    this._onChangeTextAlign(TEXT_ALIGN.RIGHT);
  },
  render: function() {
    return (
      <div className="align-area">
        <div>
          <SimpleButton icon={AlignLeftIcon} onClick={this._onClickLeft}/>
        </div>
        <div>
          <SimpleButton icon={AlignCenterIcon} onClick={this._onClickCenter}/>
        </div>
        <div>
          <SimpleButton icon={AlignRightIcon} onClick={this._onClickRight}/>
        </div>
      </div>
    );
  }
});

module.exports = AlignArea;