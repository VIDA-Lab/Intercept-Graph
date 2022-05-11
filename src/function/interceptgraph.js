import * as d3 from 'd3'

import {axisRadialInner, axisRadialOuter} from "./libs/d3-radial-axis";


'./libs/d3-radial-axis'

const interceptgraph_build = (svg_id, data_, flip=false) =>{

    /*如果 dom_id 没有的话，报错*/
    if (d3.select(`#${svg_id}`).size()==0){
        console.log("'svg_id' not found")
        return
    }

    const svg = d3.select(`#${svg_id}`)

    /*width height 为 svg 画布的长宽，cx cy是画布的中心, r 是 IG 半径（默认0.8倍的 cx或cy）*/
    const [width] = svg.attr('width').match(/\d+/g) || ['600'], [height] = svg.attr('height').match(/\d+/g) || ['600']
    /*IG 的中心*/
    const cx = width/2, cy = height/2
    const r = d3.min([cx, cy]) * 0.8

    /*转换 csv text形式 到csv 对象形式*/
    let data = {}
    d3.csvParseRows(data_).map(d=>{
        data[d[0]] = {
            'item': d[0],
            'd1': +d[1],
            'd2': +d[2]
        }
    })


    /*先将 所有的数据按照 上升和下降 进行区分*/
    let data_rise, data_drop

    data_rise = Object.fromEntries(Object.entries(data).filter(d=>{
        return d[1]['d2'] - d[1]['d1'] >= 0
    }))

    data_drop = Object.fromEntries(Object.entries(data).filter(d=>{
        return d[1]['d2'] - d[1]['d1'] < 0
    }))




    /*开始计算 对上升和下降的 extent*/
    let extent_rise = d3.extent(Object.values(data_rise).map(d=>d['d1']).concat(Object.values(data_rise).map(d=>d['d2'])))
    let extent_drop = d3.extent(Object.values(data_drop).map(d=>d['d1']).concat(Object.values(data_drop).map(d=>d['d2'])))




    /***********开始画图**********/
    let g = svg.append('g')
        .classed('interceptgraph_g', true)
        .attr('transform', `translate(${cx}, ${cy})`)



    /*开始创建 scale 环形坐标轴 上升*/
    let outerAxisScale_rise = d3.scaleLinear()
        .domain(extent_rise)
        .range([Math.PI, 0]);
    let innerAxisScale_rise = d3.scaleLinear()
        .domain(extent_rise)
        .range(flip?[0, Math.PI]:[Math.PI, 0]);

    let outerAxisRadius_rise = r;
    let innerAxisRadius_rise = 0.4 * r;


    let outerAxis_rise = axisRadialOuter(outerAxisScale_rise, outerAxisRadius_rise);
    let innerAxis_rise = axisRadialOuter(innerAxisScale_rise, innerAxisRadius_rise);




    /*开始创建 scale 环形坐标轴 下降*/
    let outerAxisScale_drop = d3.scaleLinear()
        .domain(extent_drop)
        .range([Math.PI, 2 * Math.PI]);
    let innerAxisScale_drop = d3.scaleLinear()
        .domain(extent_drop)
        .range(flip?[2 * Math.PI, Math.PI]:[Math.PI, 2 * Math.PI]);

    let outerAxisRadius_drop = r;
    let innerAxisRadius_drop = 0.9 * r;

    let outerAxis_drop = axisRadialOuter(outerAxisScale_drop, outerAxisRadius_drop);
    let innerAxis_drop = axisRadialOuter(innerAxisScale_drop, innerAxisRadius_drop);




    /*生成DOM，但是是invisible， 用来抽取每个tick的坐标，来画放射虚线，*/
    g.append('g').classed('outerAxis_rise_', true).call(outerAxis_rise.ticks(10));
    g.append('g').classed('outerAxis_drop_', true).call(outerAxis_drop.ticks(10));

    g.append('g').classed('innerAxis_rise_', true).call(innerAxis_rise.ticks(10));
    g.append('g').classed('innerAxis_drop_', true).call(innerAxis_drop.ticks(10));


    /*根据scale，画放射的 用来对齐 的虚线*/
    let tickArray_rise = [], tickArray_drop = []
    /*抽取 rise 的 axis上所有tick*/
    d3.selectAll('.outerAxis_rise_>.tick').each(function(){
        let [_, x, y] = /translate\(\s*([^\s,)]+)[ ,]([^\s,)]+)/.exec(d3.select(this).attr('transform'))
        tickArray_rise.push([+x,+y])
    })

    /*抽取 drop 的 axis上所有tick*/
    d3.selectAll('.outerAxis_drop_>.tick').each(function(){
        let [_, x, y] = /translate\(\s*([^\s,)]+)[ ,]([^\s,)]+)/.exec(d3.select(this).attr('transform'))
        tickArray_drop.push([+x,+y])
    })



    /*开始画 放射的虚线*/
    g.selectAll('.dottedLine')
        .data(tickArray_rise.concat(tickArray_drop))
        .join('line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', d=>d[0])
        .attr('y2', d=>d[1])
        .attr('stroke', '#ababab')
        .attr('stroke-width', 0.7)
        .attr('stroke-dasharray', 4)



    /* 添加 dragging 交互 */
    let dragging = d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);




    /*根据scale，画axis*/
    g.append('g').classed('outerAxis_rise', true).call(outerAxis_rise.ticks(10).tickSize(3));
    g.append('g').classed('outerAxis_drop', true).call(outerAxis_drop.ticks(10).tickSize(3));

    g.append('g').classed('innerAxis_rise', true).call(innerAxis_rise.ticks(10).tickSize(3)).call(dragging);
    g.append('g').classed('innerAxis_drop', true).call(innerAxis_drop.ticks(10).tickSize(3)).call(dragging);




    /* 开始画 line segment */
    /* 上升 */
    g.selectAll('.intercept_rise')
        .data(Object.values(data_rise))
        .join('line')
        .classed('intercept_rise', true)
        .attr('x1', d=>innerAxisRadius_rise * Math.sin(Math.PI - innerAxisScale_rise(d['d1'])))
        .attr('y1', d=>innerAxisRadius_rise * Math.cos(Math.PI - innerAxisScale_rise(d['d1'])))
        .attr('x2', d=>outerAxisRadius_rise * Math.sin(Math.PI - outerAxisScale_rise(d['d2'])))
        .attr('y2', d=>outerAxisRadius_rise * Math.cos(Math.PI - outerAxisScale_rise(d['d2'])))
        .attr('stroke', '#1199de')
        .attr('stroke-width', 1)
        .attr('opacity', 0.5)



    /* 下降 */
    g.selectAll('.intercept_drop')
        .data(Object.values(data_drop))
        .join('line')
        .classed('intercept_drop', true)
        .attr('x1', d=>innerAxisRadius_drop * Math.sin(Math.PI - innerAxisScale_drop(d['d1'])))
        .attr('y1', d=>innerAxisRadius_drop * Math.cos(Math.PI - innerAxisScale_drop(d['d1'])))
        .attr('x2', d=>outerAxisRadius_drop * Math.sin(Math.PI - outerAxisScale_drop(d['d2'])))
        .attr('y2', d=>outerAxisRadius_drop * Math.cos(Math.PI - outerAxisScale_drop(d['d2'])))
        .attr('stroke', '#ff353a')
        .attr('stroke-width', 1)
        .attr('opacity', 0.5)





    /* fix tick label 重叠的问题 */
    d3.select(d3.selectAll('.outerAxis_rise>g>text').nodes()[0]).attr('dx', 8)
    d3.select(d3.selectAll('.outerAxis_drop>g>text').nodes()[0]).attr('dx', -8)
    d3.select(d3.selectAll('.outerAxis_rise>g>text').nodes()[d3.selectAll('.outerAxis_rise>g>text').size()-1]).attr('dx', 8)
    d3.select(d3.selectAll('.outerAxis_drop>g>text').nodes()[d3.selectAll('.outerAxis_drop>g>text').size()-1]).attr('dx', -8)




    /*开始画 clip 和 residue-items*/
    g.append('defs')
        .append('clipPath')
        .attr('id', 'clip_rise')
        .append('circle')
        .attr('r', innerAxisRadius_rise)

    g.append('defs')
        .append('clipPath')
        .attr('id', 'clip_drop')
        .append('circle')
        .attr('r', innerAxisRadius_drop)




    /* 上升 */
    g.selectAll('.intercept_rise_residue')
        .data(Object.values(data_rise))
        .join('line')
        .classed('intercept_rise_residue', true)
        .attr('x1', d=>innerAxisRadius_rise * Math.sin(Math.PI - innerAxisScale_rise(d['d1'])))
        .attr('y1', d=>innerAxisRadius_rise * Math.cos(Math.PI - innerAxisScale_rise(d['d1'])))
        .attr('x2', d=>outerAxisRadius_rise * Math.sin(Math.PI - outerAxisScale_rise(d['d2'])))
        .attr('y2', d=>outerAxisRadius_rise * Math.cos(Math.PI - outerAxisScale_rise(d['d2'])))
        .attr('stroke', '#116592')
        .attr('stroke-width', 1)
        .attr('clip-path', `url(#clip_rise`)



    /* 下降 */
    g.selectAll('.intercept_drop_residue')
        .data(Object.values(data_drop))
        .join('line')
        .classed('intercept_drop_residue', true)
        .attr('x1', d=>innerAxisRadius_drop * Math.sin(Math.PI - innerAxisScale_drop(d['d1'])))
        .attr('y1', d=>innerAxisRadius_drop * Math.cos(Math.PI - innerAxisScale_drop(d['d1'])))
        .attr('x2', d=>outerAxisRadius_drop * Math.sin(Math.PI - outerAxisScale_drop(d['d2'])))
        .attr('y2', d=>outerAxisRadius_drop * Math.cos(Math.PI - outerAxisScale_drop(d['d2'])))
        .attr('stroke', '#9d2325')
        .attr('stroke-width', 1)
        .attr('clip-path', `url(#clip_drop`)





    /* 做 inner axis 的交互 */
    function dragstarted(event){

        // console.log(d3.select(this).node())
    }



    function dragged(event){
        let x = event.x, y = event.y
        let r_ = d3.min([Math.sqrt(x*x+y*y), r])
        let className = d3.select(this).attr('class')



        /* 如果drag的是rise（右半部分） */
        if(className.split('_')[1]=='rise'){
            /* 更新 inner axis */
            d3.select(`.${className}`).remove()
            let innerAxis_rise = axisRadialOuter(innerAxisScale_rise, r_);
            g.append('g').classed('innerAxis_rise', true).call(innerAxis_rise.ticks(10).tickSize(3)).call(dragging);


            /* 更新 line segments */
            d3.selectAll('.intercept_rise').remove()

            g.selectAll('.intercept_rise')
                .data(Object.values(data_rise))
                .join('line')
                .classed('intercept_rise', true)
                .attr('x1', d=>r_ * Math.sin(Math.PI - innerAxisScale_rise(d['d1'])))
                .attr('y1', d=>r_ * Math.cos(Math.PI - innerAxisScale_rise(d['d1'])))
                .attr('x2', d=>outerAxisRadius_rise * Math.sin(Math.PI - outerAxisScale_rise(d['d2'])))
                .attr('y2', d=>outerAxisRadius_rise * Math.cos(Math.PI - outerAxisScale_rise(d['d2'])))
                .attr('stroke', '#1199de')
                .attr('stroke-width', 1)
                .attr('opacity', 0.5)


            /* 更新 residue-item 线段*/
            d3.select('#clip_rise')
                .select('circle')
                .attr('r', r_)

            g.selectAll('.intercept_rise_residue')
                .data(Object.values(data_rise))
                .join('line')
                .classed('intercept_rise_residue', true)
                .attr('x1', d=>r_ * Math.sin(Math.PI - innerAxisScale_rise(d['d1'])))
                .attr('y1', d=>r_ * Math.cos(Math.PI - innerAxisScale_rise(d['d1'])))
                .attr('x2', d=>outerAxisRadius_rise * Math.sin(Math.PI - outerAxisScale_rise(d['d2'])))
                .attr('y2', d=>outerAxisRadius_rise * Math.cos(Math.PI - outerAxisScale_rise(d['d2'])))
                .attr('stroke', '#116592')
                .attr('stroke-width', 1)
                .attr('clip-path', `url(#clip_rise`)


        }
        /* 如果drag的是rise（左半部分） */
        else{
            /* 更新 inner axis */
            d3.select(`.${className}`).remove()
            let innerAxis_drop = axisRadialOuter(innerAxisScale_drop, r_);
            g.append('g').classed('innerAxis_drop', true).call(innerAxis_drop.ticks(10).tickSize(3)).call(dragging);


            /* 更新 line segments */
            d3.selectAll('.intercept_drop').remove()

            g.selectAll('.intercept_drop')
                .data(Object.values(data_drop))
                .join('line')
                .classed('intercept_drop', true)
                .attr('x1', d=>r_ * Math.sin(Math.PI - innerAxisScale_drop(d['d1'])))
                .attr('y1', d=>r_ * Math.cos(Math.PI - innerAxisScale_drop(d['d1'])))
                .attr('x2', d=>outerAxisRadius_drop * Math.sin(Math.PI - outerAxisScale_drop(d['d2'])))
                .attr('y2', d=>outerAxisRadius_drop * Math.cos(Math.PI - outerAxisScale_drop(d['d2'])))
                .attr('stroke', '#ff353a')
                .attr('stroke-width', 1)
                .attr('opacity', 0.5)


            /* 更新 residue-item 线段*/
            d3.select('#clip_drop')
                .select('circle')
                .attr('r', r_)

            g.selectAll('.intercept_drop_residue')
                .data(Object.values(data_drop))
                .join('line')
                .classed('intercept_drop_residue', true)
                .attr('x1', d=>r_ * Math.sin(Math.PI - innerAxisScale_drop(d['d1'])))
                .attr('y1', d=>r_ * Math.cos(Math.PI - innerAxisScale_drop(d['d1'])))
                .attr('x2', d=>outerAxisRadius_drop * Math.sin(Math.PI - outerAxisScale_drop(d['d2'])))
                .attr('y2', d=>outerAxisRadius_drop * Math.cos(Math.PI - outerAxisScale_drop(d['d2'])))
                .attr('stroke', '#9d2325')
                .attr('stroke-width', 1)
                .attr('clip-path', `url(#clip_drop`)

        }

    }

    function dragended(event){
        // console.log(d3.select(this).node())


    }














}

export default interceptgraph_build;