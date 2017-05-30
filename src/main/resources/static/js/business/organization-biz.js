//销毁上一个content页面遗留vueContentObject对象实例
if (vueContentObject) vueContentObject.$destroy();

actions = {
	  'delete': {'key': 'delete', 'url': 'delete'},
	  'add': {'key': 'add', 'url': 'singleAdd'},
	  'update': {'key': 'update', 'url': 'singleUpdate'},
	  'copy': {'key': 'copy', 'url': 'singleAdd'},
	  'changeSort': {'key': 'changeSort', 'url': 'changeSort'},
	  'deleteNode': {'key': 'deleteNode', 'url': 'deleteNode'}

	};

//分页取数据url
loadPageableDataUrl = 'organizationsByPage';
//table column 显示名
tableColumnsName = ['ID','名称','描述','排序','上级机构ID','是否可用','操作'];
//table column 对应data中的属性名   全选 加 'selection' 项 , 操作 加 'operation' 项。
tableColumnsKey = ['id#sortable','name#sortable','descirption','sort','parentId','available','operation'];
//table 每行需要的按钮 
tableButtonsOnEachRow = ['rowInfoButton#查看详情'];
//格式化table行数据格式
parseValuesOnTableEachRow = function (obj) {
	return {id :obj.id,
		name :obj.name,
		descirption :obj.descirption,
		sort :obj.sort,
		parent :obj.parent,
		available :obj.available};
}

//设置add update vue form data obj
setFormDataObject({id:null,name: '',descirption: '',sort: 1,parentId: null,available: true});
////综合查询 form
//hasQueryFrom = false;
queryFormItemName = ['此节点ID下数据'];
queryFormItemKey = ['selectedNodeId'];
queryFormItemType = ['string'];
//
//
////form 验证信息 
//setFormRulesObject({
//	'username': [{trigger: 'blur',type: 'string', required: true, pattern: /^[a-zA-Z\d]\w{4,11}[a-zA-Z\d]$/, message: '用户名称必须为长度6至12位之间以字母、特殊字符(·)或数字字符组成的字符串!'},{validator: this.validateFormRules, trigger: 'blur',unique:'checkUsernameUnique',message: '用户名已被占用'}],
//	'password': [{trigger: 'blur',type: 'string', required: true, min:6,max :16,message: '密码为长度6至12位之间字符串!'},{validator: this.validateFormRules, trigger: 'blur',otherValidate:'repassword',message: '用户名已被占用'}],
//    'repassword': [{trigger: 'blur',type: 'string', required: true,message:'请输入确认密码'},{trigger: 'blur',type: 'string', validator: this.validateFormRules,equal:'password',message: '两次输入密码不一致!'}],
//    'nickname': [{trigger: 'blur',type: 'string', required: true, pattern: /^[a-zA-Z0-9·\u4e00-\u9fa5]{2,12}$/, message: '昵称必须为长度2至12位之间以字母、特殊字符(·)、汉字或数组字符组成的字符串!'},{validator: this.validateFormRules, trigger: 'blur',unique:'checkNicknameUnique',message: '昵称已被占用'}]
//});

////////////////////////////// 在vue生命周期 BeforeCreate 自定义 data ////////////////////////////////
vueContentBeforeCreate = function(){
	customVueContentData = {
		treeData: generateRootNode(),
		statusDataSelect : [{value: '1',label: '启用'},{value: '0',label: '禁用'}]
	}
};
//////////////////tree///////////////////
loadTreeRootUrl = 'organization/single';
loadTreeRootDataFunction = function() {return {id: 1}}
loadTreeNodeUrl = 'organization/children';

var checkedTreeNodesId;
var deleteNodesIdObject;
//更新
function doUpdateTreeButton() {
	if (!selectedNodeObject ||selectedNodeObject.id == -1) {
		toastInfo('请点击组织机构名称!');
		return;
	}
	getSingleData(selectedNodeObject.id, updateBefore, function(data) {
		currentAction = actions.update;
		resetForm();
		copyProperties(data, getVueObject().vueUpdateForm);
		getVueObject().vueUpdateModalVisible = true;
	});
}
function submitUpdateTreeForm(){
	submitFormValidate(currentAction, function (data) {
		toastSuccess('更新成功!');
		getVueObject().vueUpdateModalVisible = false;
		resetForm();
	});
}

//删除
function doDeleteTreeButton(){
	if (!checkedNodesObject||checkedNodesObject.length==0) {
		toastInfo('请勾选要删除的机构!');
		return;
	}
	//判断勾选的是否有 父节点 ，如果有，则询问用户是否删除此父节点下 包含未选择的子节点 是否删除
	deleteNodesIdObject = hasNotCheckedChildInParent();
	
	if(deleteNodesIdObject.parentId.length>0){
		//存在勾选父节点
		getVueObject().vueDeleteMessage = "勾选的机构存在父机构，将删除此父机构下所有子机构。是否继续删除?";
	}else{
		getVueObject().vueDeleteMessage = "即将删除以勾选的机构。是否继续删除?";
	}
//	let checkedNodestitle = getTreeCheckedNodesTitle();
	currentAction = actions.deleteNode;
//	getVueObject().vueDeleteMessage = "即将删除 [" + checkedNodestitle.toString() + "] 是否继续删除?";
//	checkedTreeNodesId = getTreeCheckedNodesId(); //将要删除的id 赋值给data
	getVueObject().vueDeleteModalVisible = true;
	
}
function submitDeleteTreeForm(){
	this.vueDeleteProgressVisible = true;
	submitForm(currentAction, deleteNodesIdObject, function (data) {
		if (data.count > 0) {
			toastSuccess('删除成功');
			getVueObject().vueDeleteProgressVisible = false;
		} else {
			toastWarning('记录正被使用，禁止删除');
			getVueObject().vueDeleteProgressVisible = false;
		}
		getVueObject().vueDeleteModalVisible = false;
	}, function (errorMessage) {
		toastError(errorMessage);
		getVueObject().vueDeleteProgressVisible = false;
	});
}
   
//上移
function doUpRemoveButton(){
	submitUpAndDownRemove(true);
}
//下移
function doDownRemoveButton(){
	submitUpAndDownRemove(false);
}

//上移下移
function submitUpAndDownRemove(isUp){
	
	if(!selectedNodeObject||selectedNodeObject.id==-1){
		toastInfo('请选择机构!');
		return;
	}
	
	let beforeId = selectedNodeObject.id;
	getSingleData(beforeId, updateBefore, function(data) {
		currentAction = actions.changeSort;
		if(data.sort>1){
			
			let parentId = data.parentId;
			if(parentId==0) return;
			let afterId ;
			//根据parentId 取到 节点，取此节点的children数组。遍历数组 调换两个对象位置
			let rootNode = getVueObject().treeData;
			let childrenArray = getChildFromNodeNotDelete(parentId, rootNode[0]).children;
			let selectedNodeObjectIndex = -1;
			
			for(let index in childrenArray){
				if(childrenArray[index].id == selectedNodeObject.id) {
					selectedNodeObjectIndex =Number(index);
					break;
				}
			}
			
			if(isUp){
				if(selectedNodeObjectIndex>0){
					afterId = childrenArray[selectedNodeObjectIndex - 1].id;
				}else{
					toastInfo('无法继续移动!');
				}
			}else{
				if(selectedNodeObjectIndex < childrenArray.length-1){
					afterId = childrenArray[selectedNodeObjectIndex + 1].id;
				}else{
					toastInfo('无法继续移动!');
				}
			}
			
			if(afterId)
				submitForm(currentAction, {'beforeId':beforeId,'afterId':afterId}, function (data) {
					toastSuccess('上移成功!');
					if(isUp) swapItems(childrenArray, selectedNodeObjectIndex, selectedNodeObjectIndex - 1);
					else swapItems(childrenArray, selectedNodeObjectIndex, selectedNodeObjectIndex + 1);
				});
		}else{
			toastInfo('无法继续移动!');
		}
	});	

}

//交换数组元素
var swapItems = function(arr, index1, index2) {
  arr[index1] = arr.splice(index2, 1, arr[index1])[0];
  return arr;
};

vueContentMethods.toggleExpand = toggleExpand;
vueContentMethods.checkChange = checkChange;
vueContentMethods.getCheckedNodes = getCheckedNodes;
vueContentMethods.getSelectedNodes = getSelectedNodes; 

//点击节点名称
vueContentMethods.selectChange = function(node){
	if(node.length!=0){
		selectedNodeObject = node[0];
		getVueObject()[currentQueryFormName].selectedNodeId = selectedNodeObject.id;//设置query from 
		getVueObject().doLoadPage();
	}else{
		selectedNodeObject = null;
	}
};

var vueContentObject = new Vue(initializeContentOptions());

$(function() {
	//初始化树根节点下级子节点数据，并展开根节点下级子节点
	toggleExpand(vueContentObject.treeData[0]);
	vueContentObject.$refs.tree.$children[0].handleExpand(toggleExpand);
	disableUpdateData(getVueRefObject('tree'));
	//为了解决 先选checkbox后点击select 出现的 上级checkbox被选中的情况，暂时不明白原因
	getVueObject().treeData[0].selected=false;
});