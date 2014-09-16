/**
*  @module cloudkid.createjs
*/
(function(){
	
	/**
	*   CharacterClip is used by the CharacterController class
	*   
	*   @class createjs.CharacterClip
	*   @constructor
	*   @param {String} event Animator event to play
	*   @param {int} loops The number of loops
	*/
	var CharacterClip = function(event, loops)
	{
		/**
		* The event to play
		*
		* @property {String} event
		*/
		this.event = event;
		
		/**
		* The number of times to loop
		* 
		* @property {int} loops
		*/
		this.loops = loops || 0;
	};
		
	
	// Assign to the cloudkid namespace
	namespace('cloudkid').CharacterClip = CharacterClip;
	namespace('cloudkid.createjs').CharacterClip = CharacterClip;

}());