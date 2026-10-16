import { completeClipped } from './dtrReference';

// Mode codes transcribed from the user's CMOS reference table.
const clipped = [
  ['1', 'THIRD PARTY POOLING MOVE (TRUCKLOAD/LESS THAN TRUCKLOAD)'],
  ['2', 'GOVERNMENT WATERCRAFT, BARGE OR LIGHTER'],
  ['3', 'OCEAN (ROLL ON - ROLL OFF)'],
  ['4', 'DEFENSE COURIER SERVICE'],
  ['5', 'SURFACE SMALL PACKAGE CARRIER'],
  ['6', 'MILITARY OFFICIAL MAIL (MOM)'],
  ['7', 'EXPRESS MAIL'],
  ['8', 'PIPELINE'],
  ['9', 'LOCAL DELIVERY'],
  ['A', 'MOTOR, TRUCKLOAD'],
  ['B', 'MOTOR, LESS THAN TRUCKLOAD'],
  ['C', 'VAN (UNPACKED, UNCRATED PERSONAL OR GOVERNMENT PROPERTY)'],
  ['D', 'DRIVEAWAY, TRUCKAWAY, TOWAWAY'],
  ['E', 'BUS'],
  ['F', 'AIR MOBILITY COMMAND (AMC) CHANNEL AND SPECIAL ASSIGNMENT'],
  ['G', 'SURFACE PARCEL POST'],
  ['H', 'AIR PARCEL POST'],
  ['I', 'GOVERNMENT TRUCKS FOR SHIPMENT OUTSIDE LOCAL DELIVERY'],
  ['J', 'AIR, SMALL PACKAGE CARRIER'],
  ['K', 'RAIL'],
  ['L', 'INTERMODAL (PIGGYBACK)'],
  ['M', 'SURFACE FREIGHT FORWARDER'],
  ['N', 'SHIPPER AGENT'],
  ['O', 'ORGANIC MILITARY AIR INCLUDING AIRCRAFT OF FOREIGN GOVERNMENTS'],
  ['P', 'THROUGH GOVERNMENT BILL OF LADING (TGBL)'],
  ['Q', 'COMMERCIAL AIR FREIGHT'],
  ['R', 'SHIPPER AGENT (TRUCK)'],
  ['S', 'SCHEDULED TRUCK SERVICE (APPLIES TO CONTR...'],
  ['T', 'AIR FREIGHT FORWARDER'],
  ['U', 'INTERMODAL (PERSONAL PROPERTY)'],
  ['V', 'COMMERCIAL/GOVERNMENT-OWNED/LEASED SHI...'],
  ['W', 'WATER, RIVER, LAKE, COASTAL (COMMERCIAL)'],
  ['X', 'BEARER, WALK-THRU (CUSTOMER PICKUP OF MAT...'],
  ['Y', 'SHIPPER ASSOCIATION'],
  ['Z', 'MILITARY SEALIFT COMMAND (MSC), CONTROLLED...'],
];
const modes = completeClipped(clipped, 'transportationMethods', 1);
const ediCodes = ['PT', 'B', 'RO', 'AR', 'MP', '6', '7', 'PL', 'LD', 'J', 'LT', 'VA', 'TA', 'BU', 'ED', 'D', 'AE', 'SR', 'AF', 'R', 'X', 'SF', 'SB', 'LA', 'Q', 'AF', 'SC', 'L', 'FA', 'IP', 'O', 'W', 'CE', 'SD', 'MS'];
export const MODE_REFERENCE = modes;
export const MIL_EDI_REFERENCE = modes.map(([mil, description], i) => [mil, ediCodes[i], description]);
export const ediForMilMode = value => MIL_EDI_REFERENCE.find(([mil]) => mil === String(value).trim().toUpperCase())?.[1] || '';

