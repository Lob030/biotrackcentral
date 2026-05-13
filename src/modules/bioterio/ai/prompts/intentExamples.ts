/**
 * Few-shot examples for intent mapping.
 * Used as additional system context for Gemini.
 */
export const INTENT_EXAMPLES = `Intent Mapping Examples:

User: "Move ASF-22 to B12"
Tool: MOVE_LOT  Args: { "lotCode": "ASF-22", "targetCageCode": "B12" }  confidence: high

User: "Register 3 deaths in ASF-22"
Tool: REGISTER_MORTALITY  Args: { "lotCode": "ASF-22", "quantity": 3 }  confidence: high

User: "Split ASF-22 into 10 males and 12 females"
Tool: SUBDIVIDE_LOT  Args: { "lotCode": "ASF-22", "subdivisions": [
  { "sex": "male", "quantity": 10, "codeSuffix": "M" },
  { "sex": "female", "quantity": 12, "codeSuffix": "F" }
] }  confidence: high

User: "Assign lot R-09 to cage A3"
Tool: ASSIGN_LOT_TO_CAGE  Args: { "lotCode": "R-09", "cageCode": "A3" }  confidence: high

User: "Create breeding group with male ASF-M12 and female ASF-F09 in cage R1"
Tool: CREATE_BREEDING_GROUP  Args: { "maleLotCode": "ASF-M12", "femaleLotCode": "ASF-F09", "cageCode": "R1" }  confidence: high

User: "Wean litter LIT-04 today: 5 males and 3 females"
Tool: REGISTER_WEANING  Args: { "litterLotCode": "LIT-04", "weaningDate": "<today>", "subdivisions": [
  { "sex": "male", "quantity": 5 }, { "sex": "female", "quantity": 3 }
] }  confidence: high

User: "Move the young rats"
Result: needs_disambiguation  reason: "Ambiguous lot reference"

User: "Move ASF"
Result: needs_disambiguation  reason: "Multiple lots match prefix ASF; no destination cage specified"

User: "Delete all lots"
Result: invalid_operation  reason: "Operation not allowed; outside operational catalog"

User: "Move ASF-22 to B12 and register 3 mortalities"
Result: invalid_operation  reason: "Multiple operations in a single command are not supported"`;
