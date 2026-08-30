import { Address, BigInt } from "@graphprotocol/graph-ts";
import { Transfer } from "../generated/templates/DuckToken/ERC20";
import { Holder } from "../generated/schema";

const ZERO_ADDRESS = Address.zero();

function loadOrCreateHolder(token: Address, account: Address): Holder {
  let id = token.toHexString() + "-" + account.toHexString();
  let holder = Holder.load(id);
  if (holder == null) {
    holder = new Holder(id);
    holder.token = token.toHexString();
    holder.account = account;
    holder.balance = BigInt.zero();
  }
  return holder as Holder;
}

export function handleTransfer(event: Transfer): void {
  let token = event.address;

  if (event.params.from.notEqual(ZERO_ADDRESS)) {
    let from = loadOrCreateHolder(token, event.params.from);
    from.balance = from.balance.minus(event.params.value);
    from.updatedAt = event.block.timestamp;
    from.updatedAtBlock = event.block.number;
    from.save();
  }

  if (event.params.to.notEqual(ZERO_ADDRESS)) {
    let to = loadOrCreateHolder(token, event.params.to);
    to.balance = to.balance.plus(event.params.value);
    to.updatedAt = event.block.timestamp;
    to.updatedAtBlock = event.block.number;
    to.save();
  }
}
