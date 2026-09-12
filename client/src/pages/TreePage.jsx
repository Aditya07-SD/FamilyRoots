import { useEffect, useMemo, useState } from "react";

import ReactFlow, {
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  MarkerType,
  useReactFlow,
} from "reactflow";

import { api } from "../lib/api";

import {
  Plus,
  Search,
  X,
  UserRoundPlus,
  Trash2,
  MapPin,
  Briefcase,
  CalendarDays,
  Mail,
  Phone,
  Pencil,
} from "lucide-react";


// ============================================================
// PERSON NODE
// ============================================================

function NodeCard({ data }) {
  const member = data.member;

  return (
    <div
      className={
        "person-node " +
        (data.selected ? "selected" : "")
      }
    >
      <Handle
        type="target"
        position={Position.Top}
        id="top"
      />

      <div className="avatar">
        {member.photoUrl ? (
          <img
            src={member.photoUrl}
            alt={member.fullName}
          />
        ) : (
          <span>
            {member.fullName?.[0]?.toUpperCase() || "?"}
          </span>
        )}
      </div>

      <strong title={member.fullName}>
        {member.fullName}
      </strong>

      <span title={member.occupation || "Family member"}>
        {member.occupation || "Family member"}
      </span>

      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
      />
    </div>
  );
}


// ============================================================
// CALCULATE GENERATION LEVELS
// ============================================================

function calculateLevels(members, relationships) {
  const ids = new Set(
    members.map((member) => member._id)
  );

  const parents = new Map();

  ids.forEach((id) => {
    parents.set(id, []);
  });

  relationships
    .filter(
      (relationship) =>
        relationship.relationshipType === "parent_of"
    )
    .forEach((relationship) => {
      const source = relationship.sourceMember;
      const target = relationship.targetMember;

      if (
        ids.has(source) &&
        ids.has(target)
      ) {
        parents
          .get(target)
          .push(source);
      }
    });

  const levels = new Map();
  const visiting = new Set();

  function getLevel(id) {
    if (levels.has(id)) {
      return levels.get(id);
    }

    if (visiting.has(id)) {
      return 0;
    }

    visiting.add(id);

    const memberParents =
      parents.get(id) || [];

    let level = 0;

    if (memberParents.length > 0) {
      level =
        Math.max(
          ...memberParents.map((parentId) =>
            getLevel(parentId)
          )
        ) + 1;
    }

    visiting.delete(id);

    levels.set(id, level);

    return level;
  }

  members.forEach((member) => {
    getLevel(member._id);
  });


  // ----------------------------------------------------------
  // Spouses and siblings stay on the same generation.
  // ----------------------------------------------------------

  const sameGenerationRelations =
    relationships.filter(
      (relationship) =>
        relationship.relationshipType === "spouse_of" ||
        relationship.relationshipType === "sibling_of"
    );

  for (
    let pass = 0;
    pass < members.length;
    pass++
  ) {
    let changed = false;

    sameGenerationRelations.forEach(
      (relationship) => {
        const source =
          relationship.sourceMember;

        const target =
          relationship.targetMember;

        if (
          !levels.has(source) ||
          !levels.has(target)
        ) {
          return;
        }

        const sourceLevel =
          levels.get(source);

        const targetLevel =
          levels.get(target);

        if (sourceLevel !== targetLevel) {
          const commonLevel = Math.max(
            sourceLevel,
            targetLevel
          );

          if (
            levels.get(source) !==
            commonLevel
          ) {
            levels.set(
              source,
              commonLevel
            );

            changed = true;
          }

          if (
            levels.get(target) !==
            commonLevel
          ) {
            levels.set(
              target,
              commonLevel
            );

            changed = true;
          }
        }
      }
    );

    if (!changed) {
      break;
    }
  }

  return levels;
}


// ============================================================
// SPOUSE MAP
// ============================================================

function getSpouseMap(
  members,
  relationships
) {
  const memberIds = new Set(
    members.map((member) => member._id)
  );

  const spouseMap = new Map();

  relationships
    .filter(
      (relationship) =>
        relationship.relationshipType === "spouse_of"
    )
    .forEach((relationship) => {
      const source =
        relationship.sourceMember;

      const target =
        relationship.targetMember;

      if (
        memberIds.has(source) &&
        memberIds.has(target)
      ) {
        spouseMap.set(source, target);
        spouseMap.set(target, source);
      }
    });

  return spouseMap;
}


// ============================================================
// TREE LAYOUT
// ============================================================

function createLayout(
  members,
  relationships,
  selected
) {
  const levels = calculateLevels(
    members,
    relationships
  );

  const spouseMap = getSpouseMap(
    members,
    relationships
  );

  const generationMap = new Map();

  members.forEach((member) => {
    const level =
      levels.get(member._id) || 0;

    if (!generationMap.has(level)) {
      generationMap.set(level, []);
    }

    generationMap
      .get(level)
      .push(member);
  });

  const nodes = [];

  const sortedLevels = [
    ...generationMap.keys(),
  ].sort((a, b) => a - b);


  // ----------------------------------------------------------
  // Generate each generation as a horizontal row.
  // ----------------------------------------------------------

  sortedLevels.forEach((level) => {
    const row =
      generationMap.get(level);

    const used = new Set();

    let currentX = 0;

    row.forEach((member) => {
      if (used.has(member._id)) {
        return;
      }

      const spouseId =
        spouseMap.get(member._id);

      const spouse = spouseId
        ? row.find(
            (item) =>
              item._id === spouseId
          )
        : null;


      // ------------------------------------------------------
      // Spouses stay next to each other.
      // ------------------------------------------------------

      if (
        spouse &&
        !used.has(spouse._id)
      ) {
        nodes.push(
          createNode(
            member,
            currentX,
            level,
            selected
          )
        );

        nodes.push(
          createNode(
            spouse,
            currentX + 1,
            level,
            selected
          )
        );

        used.add(member._id);
        used.add(spouse._id);

        currentX += 2;

        return;
      }


      // ------------------------------------------------------
      // Normal member.
      // ------------------------------------------------------

      nodes.push(
        createNode(
          member,
          currentX,
          level,
          selected
        )
      );

      used.add(member._id);

      currentX += 1;
    });
  });


  // ----------------------------------------------------------
  // Center each generation.
  // ----------------------------------------------------------

  const rowGroups = new Map();

  nodes.forEach((node) => {
    const level =
      levels.get(node.id) || 0;

    if (!rowGroups.has(level)) {
      rowGroups.set(level, []);
    }

    rowGroups
      .get(level)
      .push(node);
  });

  rowGroups.forEach((row) => {
    const totalWidth =
      (row.length - 1) * 230;

    row.forEach((node) => {
      node.position.x -=
        totalWidth / 2;
    });
  });

  return nodes;
}


// ============================================================
// NODE FACTORY
// ============================================================

function createNode(
  member,
  column,
  level,
  selected
) {
  return {
    id: member._id,

    type: "person",

    position: {
      x: column * 230,
      y: level * 270,
    },

    data: {
      member,

      selected:
        selected?._id ===
        member._id,
    },

    draggable: false,
  };
}


// ============================================================
// REACT FLOW PROVIDER
// ============================================================

function Canvas({
  nodes,
  edges,
  onSelect,
}) {
  return (
    <ReactFlowProvider>
      <FlowCanvas
        nodes={nodes}
        edges={edges}
        onSelect={onSelect}
      />
    </ReactFlowProvider>
  );
}


// ============================================================
// REACT FLOW CANVAS
// ============================================================

function FlowCanvas({
  nodes,
  edges,
  onSelect,
}) {
  const {
    fitView,
  } = useReactFlow();

  useEffect(() => {
    const timer =
      setTimeout(() => {
        fitView({
          padding: 0.2,
          duration: 500,
        });
      }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [
    nodes.length,
    edges.length,
    fitView,
  ]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={{
        person: NodeCard,
      }}
      onNodeClick={(_, node) => {
        onSelect(
          node.data.member
        );
      }}
      minZoom={0.15}
      maxZoom={1.8}
      fitView
      nodesConnectable={false}
      elementsSelectable
      proOptions={{
        hideAttribution: true,
      }}
    >
      <Background
        gap={34}
        size={1}
        color="#dbe6d8"
      />

      <Controls />

      <MiniMap
        nodeStrokeWidth={3}
      />
    </ReactFlow>
  );
}


// ============================================================
// MEMBER DETAILS
// ============================================================

function Details({
  member,
  close,
  onAdd,
  onEdit,
  onDelete,
}) {
  if (!member) {
    return null;
  }

  return (
    <aside className="details">

      {/* Close */}

      <button
        className="icon-btn close"
        onClick={close}
        aria-label="Close details"
      >
        <X size={18} />
      </button>


      {/* Profile image */}

      <div className="profile-avatar">
        {member.photoUrl ? (
          <img
            src={member.photoUrl}
            alt={member.fullName}
          />
        ) : (
          member.fullName
            ?.charAt(0)
            ?.toUpperCase()
        )}
      </div>


      <p className="eyebrow">
        FAMILY MEMBER
      </p>


      <h2>
        {member.fullName}
      </h2>


      {/* Location */}

      <p className="muted">
        {member.location ? (
          <>
            <MapPin
              size={14}
              style={{
                verticalAlign: "middle",
                marginRight: 5,
              }}
            />

            {member.location}
          </>
        ) : (
          "Location not added"
        )}
      </p>


      {/* Details grid */}

      <div className="detail-grid">

        <div>
          <small>
            <CalendarDays size={12} />
            Born
          </small>

          <b>
            {member.dateOfBirth
              ? new Date(
                  member.dateOfBirth
                ).toLocaleDateString()
              : "—"}
          </b>
        </div>


        <div>
          <small>
            <Briefcase size={12} />
            Occupation
          </small>

          <b>
            {member.occupation ||
              "—"}
          </b>
        </div>


        <div>
          <small>
            <Mail size={12} />
            Email
          </small>

          <b>
            {member.email || "—"}
          </b>
        </div>


        <div>
          <small>
            <Phone size={12} />
            Phone
          </small>

          <b>
            {member.phone || "—"}
          </b>
        </div>

      </div>


      {/* Biography */}

      {member.biography && (
        <>
          <h4>
            About
          </h4>

          <p>
            {member.biography}
          </p>
        </>
      )}


      {/* Actions */}

      <div className="actions">

        <button
          className="secondary"
          onClick={onAdd}
        >
          <UserRoundPlus
            size={16}
          />

          Add relative
        </button>


        <button
          className="secondary"
          onClick={onEdit}
        >
          <Pencil size={16} />

          Edit
        </button>


        <button
          className="danger"
          onClick={onDelete}
        >
          <Trash2
            size={16}
          />

          Delete
        </button>

      </div>

    </aside>
  );
}


// ============================================================
// ADD MEMBER MODAL
// ============================================================

function AddModal({
  anchor,
  onClose,
  onSaved,
}) {
  const [
    relationship,
    setRelationship,
  ] = useState("child");


  const [
    form,
    setForm,
  ] = useState({
    fullName: "",
    gender: "unknown",
    occupation: "",
    location: "",
    biography: "",
    dateOfBirth: "",
    dateOfDeath: "",
    email: "",
    phone: "",
  });


  const [
    photo,
    setPhoto,
  ] = useState(null);


  const [
    busy,
    setBusy,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState("");


  function updateField(event) {
    setForm({
      ...form,
      [event.target.name]:
        event.target.value,
    });
  }


  async function save(event) {
    event.preventDefault();

    setError("");
    setBusy(true);

    try {

      // ------------------------------------------------------
      // Upload photo to Cloudinary.
      // ------------------------------------------------------

      let photoData = {};

      if (photo) {
        const formData =
          new FormData();

        formData.append(
          "photo",
          photo
        );

        const uploadResponse =
          await api.post(
            "/uploads/photo",
            formData
          );

        photoData =
          uploadResponse
            .data
            .data;
      }


      // ------------------------------------------------------
      // Create member.
      // ------------------------------------------------------

      const memberResponse =
        await api.post(
          "/members",
          {
            ...form,
            ...photoData,
          }
        );

      const member =
        memberResponse
          .data
          .data
          .member;


      // ------------------------------------------------------
      // Create relationship.
      // ------------------------------------------------------

      if (anchor) {

        let type =
          "parent_of";

        if (
          relationship ===
          "spouse"
        ) {
          type = "spouse_of";
        }

        if (
          relationship ===
          "sibling"
        ) {
          type = "sibling_of";
        }


        let sourceMemberId;
        let targetMemberId;


        if (
          relationship ===
          "parent"
        ) {
          sourceMemberId =
            member._id;

          targetMemberId =
            anchor._id;
        } else {
          sourceMemberId =
            anchor._id;

          targetMemberId =
            member._id;
        }


        await api.post(
          "/relationships",
          {
            sourceMemberId,
            targetMemberId,
            relationshipType:
              type,
          }
        );
      }


      await onSaved();

      onClose();

    } catch (err) {

      console.error(
        "Failed to add member:",
        err
      );

      setError(
        err?.response?.data?.message ||
        "Unable to save the family member."
      );

    } finally {

      setBusy(false);

    }
  }


  return (
    <div className="modal-backdrop">

      <form
        className="modal"
        onSubmit={save}
      >

        {/* Header */}

        <div className="modal-head">

          <div>

            <p className="eyebrow">
              NEW CONNECTION
            </p>

            <h2>
              Add family member
            </h2>

          </div>


          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
          >
            <X />
          </button>

        </div>


        {/* Connect to */}

        {anchor && (
          <label>
            Connect to

            <input
              value={
                anchor.fullName
              }
              disabled
            />
          </label>
        )}


        {/* Relationship */}

        <label>
          Relationship

          <select
            value={relationship}
            onChange={(event) =>
              setRelationship(
                event.target.value
              )
            }
          >
            <option value="child">
              Child
            </option>

            <option value="parent">
              Parent
            </option>

            <option value="spouse">
              Spouse / partner
            </option>

            <option value="sibling">
              Sibling
            </option>
          </select>
        </label>


        {/* Full name */}

        <label>
          Full name

          <input
            name="fullName"
            value={
              form.fullName
            }
            onChange={
              updateField
            }
            required
            placeholder="Enter full name"
          />
        </label>


        {/* Gender / occupation */}

        <div className="two">

          <label>
            Gender

            <select
              name="gender"
              value={
                form.gender
              }
              onChange={
                updateField
              }
            >
              <option value="unknown">
                Unknown
              </option>

              <option value="female">
                Female
              </option>

              <option value="male">
                Male
              </option>

              <option value="nonbinary">
                Nonbinary
              </option>
            </select>
          </label>


          <label>
            Occupation

            <input
              name="occupation"
              value={
                form.occupation
              }
              onChange={
                updateField
              }
              placeholder="Engineer"
            />
          </label>

        </div>


        {/* Dates */}

        <div className="two">

          <label>
            Birth date

            <input
              type="date"
              name="dateOfBirth"
              value={
                form.dateOfBirth
              }
              onChange={
                updateField
              }
            />
          </label>


          <label>
            Death date

            <input
              type="date"
              name="dateOfDeath"
              value={
                form.dateOfDeath
              }
              onChange={
                updateField
              }
            />
          </label>

        </div>


        {/* Location */}

        <label>
          Location

          <input
            name="location"
            value={
              form.location
            }
            onChange={
              updateField
            }
            placeholder="Delhi, India"
          />
        </label>


        {/* Email / phone */}

        <div className="two">

          <label>
            Email

            <input
              type="email"
              name="email"
              value={
                form.email
              }
              onChange={
                updateField
              }
              placeholder="person@example.com"
            />
          </label>


          <label>
            Phone

            <input
              name="phone"
              value={
                form.phone
              }
              onChange={
                updateField
              }
              placeholder="+91..."
            />
          </label>

        </div>


        {/* Photo */}

        <label>
          Profile photo

          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) =>
              setPhoto(
                event.target.files?.[0] ||
                null
              )
            }
          />
        </label>


        {/* Biography */}

        <label>
          About

          <textarea
            name="biography"
            rows="4"
            value={
              form.biography
            }
            onChange={
              updateField
            }
            placeholder="Write something about this family member..."
          />
        </label>


        {/* Error */}

        {error && (
          <div className="error">
            {error}
          </div>
        )}


        {/* Submit */}

        <button
          className="primary"
          disabled={busy}
          type="submit"
        >
          {busy
            ? "Saving…"
            : "Save member & connect"}
        </button>

      </form>

    </div>
  );
}


// ============================================================
// EDIT MEMBER MODAL
// ============================================================

function EditModal({
  member,
  onClose,
  onSaved,
}) {
  const [
    form,
    setForm,
  ] = useState({
    fullName:
      member.fullName || "",

    gender:
      member.gender || "unknown",

    occupation:
      member.occupation || "",

    location:
      member.location || "",

    biography:
      member.biography || "",

    dateOfBirth:
      member.dateOfBirth
        ? new Date(
            member.dateOfBirth
          )
            .toISOString()
            .split("T")[0]
        : "",

    dateOfDeath:
      member.dateOfDeath
        ? new Date(
            member.dateOfDeath
          )
            .toISOString()
            .split("T")[0]
        : "",

    email:
      member.email || "",

    phone:
      member.phone || "",
  });


  const [
    photo,
    setPhoto,
  ] = useState(null);


  const [
    busy,
    setBusy,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState("");


  function updateField(event) {
    setForm({
      ...form,
      [event.target.name]:
        event.target.value,
    });
  }


  async function save(event) {
    event.preventDefault();

    setBusy(true);
    setError("");


    try {

      // ------------------------------------------------------
      // Upload replacement image.
      // ------------------------------------------------------

      let photoData = {};

      if (photo) {

        const formData =
          new FormData();

        formData.append(
          "photo",
          photo
        );

        const uploadResponse =
          await api.post(
            "/uploads/photo",
            formData
          );

        photoData =
          uploadResponse
            .data
            .data;
      }


      // ------------------------------------------------------
      // Update member.
      // ------------------------------------------------------

      await api.put(
        `/members/${member._id}`,
        {
          ...form,
          ...photoData,
        }
      );


      // ------------------------------------------------------
      // Reload tree.
      // ------------------------------------------------------

      await onSaved();

      onClose();

    } catch (err) {

      console.error(
        "Failed to update member:",
        err
      );

      setError(
        err?.response?.data?.message ||
        "Unable to update family member."
      );

    } finally {

      setBusy(false);

    }
  }


  return (
    <div className="modal-backdrop">

      <form
        className="modal"
        onSubmit={save}
      >

        {/* Header */}

        <div className="modal-head">

          <div>

            <p className="eyebrow">
              FAMILY MEMBER
            </p>

            <h2>
              Edit member
            </h2>

          </div>


          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            disabled={busy}
          >
            <X />
          </button>

        </div>


        {/* Current profile */}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 18,
          }}
        >

          <div
            style={{
              width: 72,
              height: 72,
              minWidth: 72,
              borderRadius: "50%",
              overflow: "hidden",
              background: "#e4efdf",
              display: "grid",
              placeItems: "center",
              color: "#315e3e",
              fontSize: 25,
              fontWeight: 700,
            }}
          >

            {photo ? (

              <img
                src={URL.createObjectURL(
                  photo
                )}
                alt="New profile"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />

            ) : member.photoUrl ? (

              <img
                src={
                  member.photoUrl
                }
                alt={
                  member.fullName
                }
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />

            ) : (

              member.fullName
                ?.charAt(0)
                ?.toUpperCase()

            )}

          </div>


          <div>

            <strong>
              {member.fullName}
            </strong>

            <p
              className="muted"
              style={{
                margin: "3px 0 0",
              }}
            >
              Update profile
              information
            </p>

          </div>

        </div>


        {/* Name */}

        <label>
          Full name

          <input
            name="fullName"
            value={
              form.fullName
            }
            onChange={
              updateField
            }
            required
            placeholder="Enter full name"
          />
        </label>


        {/* Gender / occupation */}

        <div className="two">

          <label>
            Gender

            <select
              name="gender"
              value={
                form.gender
              }
              onChange={
                updateField
              }
            >
              <option value="unknown">
                Unknown
              </option>

              <option value="female">
                Female
              </option>

              <option value="male">
                Male
              </option>

              <option value="nonbinary">
                Nonbinary
              </option>
            </select>
          </label>


          <label>
            Occupation

            <input
              name="occupation"
              value={
                form.occupation
              }
              onChange={
                updateField
              }
              placeholder="Engineer"
            />
          </label>

        </div>


        {/* Birth / death */}

        <div className="two">

          <label>
            Birth date

            <input
              type="date"
              name="dateOfBirth"
              value={
                form.dateOfBirth
              }
              onChange={
                updateField
              }
            />
          </label>


          <label>
            Death date

            <input
              type="date"
              name="dateOfDeath"
              value={
                form.dateOfDeath
              }
              onChange={
                updateField
              }
            />
          </label>

        </div>


        {/* Location */}

        <label>
          Location

          <input
            name="location"
            value={
              form.location
            }
            onChange={
              updateField
            }
            placeholder="Delhi, India"
          />
        </label>


        {/* Email / phone */}

        <div className="two">

          <label>
            Email

            <input
              type="email"
              name="email"
              value={
                form.email
              }
              onChange={
                updateField
              }
              placeholder="person@example.com"
            />
          </label>


          <label>
            Phone

            <input
              name="phone"
              value={
                form.phone
              }
              onChange={
                updateField
              }
              placeholder="+91..."
            />
          </label>

        </div>


        {/* Change photo */}

        <label>
          Change profile photo

          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) =>
              setPhoto(
                event.target.files?.[0] ||
                  null
              )
            }
          />
        </label>


        {/* Biography */}

        <label>
          About

          <textarea
            name="biography"
            rows="5"
            value={
              form.biography
            }
            onChange={
              updateField
            }
            placeholder="Write something about this family member..."
          />
        </label>


        {/* Error */}

        {error && (
          <div className="error">
            {error}
          </div>
        )}


        {/* Buttons */}

        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 10,
          }}
        >

          <button
            type="button"
            className="secondary"
            onClick={onClose}
            disabled={busy}
            style={{
              flex: 1,
            }}
          >
            Cancel
          </button>


          <button
            type="submit"
            className="primary"
            disabled={busy}
            style={{
              flex: 1,
            }}
          >
            {busy
              ? "Saving…"
              : "Save changes"}
          </button>

        </div>

      </form>

    </div>
  );
}


// ============================================================
// MAIN TREE PAGE
// ============================================================

export function TreePage() {

  const [
    members,
    setMembers,
  ] = useState([]);


  const [
    relationships,
    setRelationships,
  ] = useState([]);


  const [
    selected,
    setSelected,
  ] = useState(null);


  const [
    showAdd,
    setShowAdd,
  ] = useState(false);


  const [
    showEdit,
    setShowEdit,
  ] = useState(false);


  const [
    query,
    setQuery,
  ] = useState("");


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    loadError,
    setLoadError,
  ] = useState("");


  // ==========================================================
  // LOAD TREE
  // ==========================================================

  async function loadTree() {

    setLoading(true);
    setLoadError("");

    try {

      const response =
        await api.get(
          "/tree"
        );

      const data =
        response.data.data;

      setMembers(
        data.members || []
      );

      setRelationships(
        data.relationships || []
      );

    } catch (error) {

      console.error(
        "Failed to load family tree:",
        error
      );

      setLoadError(
        error?.response?.data?.message ||
        "Unable to load your family tree."
      );

    } finally {

      setLoading(false);

    }
  }


  useEffect(() => {
    loadTree();
  }, []);


  // ==========================================================
  // NODES
  // ==========================================================

  const nodes = useMemo(
    () =>
      createLayout(
        members,
        relationships,
        selected
      ),
    [
      members,
      relationships,
      selected,
    ]
  );


  // ==========================================================
  // EDGES
  // ==========================================================

  const edges = useMemo(() => {

    return relationships.map(
      (relationship) => {

        const type =
          relationship.relationshipType;

        const isParent =
          type === "parent_of";

        const isSpouse =
          type === "spouse_of";

        const isSibling =
          type === "sibling_of";


        return {
          id: relationship._id,

          source:
            relationship.sourceMember,

          target:
            relationship.targetMember,

          type: isParent
            ? "smoothstep"
            : "straight",

          animated:
            isParent,

          label:
            isSpouse
              ? "♥"
              : "",

          labelStyle: {
            fontSize: 16,
            fontWeight: 700,
            fill: "#8b6a3d",
          },

          labelBgStyle: {
            fill: "#ffffff",
          },

          style: {
            stroke: isSpouse
              ? "#b58b52"
              : isSibling
              ? "#8ca58b"
              : "#3c7750",

            strokeWidth:
              isParent
                ? 2.5
                : 2,

            strokeDasharray:
              isSibling
                ? "6 5"
                : undefined,
          },

          markerEnd:
            isParent
              ? {
                  type:
                    MarkerType.ArrowClosed,

                  width: 14,

                  height: 14,

                  color:
                    "#3c7750",
                }
              : undefined,

          interactionWidth: 20,
        };
      }
    );

  }, [relationships]);


  // ==========================================================
  // SEARCH
  // ==========================================================

  const matches = useMemo(() => {

    const search =
      query
        .trim()
        .toLowerCase();

    if (!search) {
      return [];
    }

    return members.filter(
      (member) => {

        const text = [
          member.fullName,
          member.location,
          member.occupation,
          member.biography,
          member.email,
          member.phone,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return text.includes(search);
      }
    );

  }, [
    members,
    query,
  ]);


  // ==========================================================
  // SELECT SEARCH RESULT
  // ==========================================================

  function selectSearchMember(
    member
  ) {
    setSelected(member);
    setQuery("");
  }


  // ==========================================================
  // DELETE MEMBER
  // ==========================================================

  async function deleteMember() {

    if (!selected) {
      return;
    }

    const confirmed =
      window.confirm(
        `Remove ${selected.fullName} from your family tree? Related connections will also be removed.`
      );

    if (!confirmed) {
      return;
    }

    try {

      await api.delete(
        `/members/${selected._id}`
      );

      setSelected(null);

      await loadTree();

    } catch (error) {

      console.error(
        "Failed to delete member:",
        error
      );

      window.alert(
        error?.response?.data?.message ||
        "Unable to delete this family member."
      );
    }
  }


  // ==========================================================
  // EDIT MEMBER
  // ==========================================================

  function openEdit() {

    if (!selected) {
      return;
    }

    setShowEdit(true);
  }


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="tree-page">

      {/* ====================================================
          HEADER
      ==================================================== */}

      <div className="tree-top">

        <div>

          <p className="eyebrow">
            YOUR FAMILY HISTORY
          </p>

          <h1>
            My Family Tree
          </h1>

          <p className="muted">
            {members.length} members ·
            parents above ·
            children below ·
            siblings together
          </p>

        </div>


        <div className="tree-actions">

          {/* Search */}

          <div className="search">

            <Search size={17} />

            <input
              placeholder="Search family…"
              value={query}
              onChange={(event) =>
                setQuery(
                  event.target.value
                )
              }
            />

            {query && (
              <button
                type="button"
                className="icon-btn"
                onClick={() =>
                  setQuery("")
                }
              >
                <X size={14} />
              </button>
            )}

          </div>


          {/* Add */}

          <button
            className="primary"
            onClick={() => {
              setSelected(null);
              setShowAdd(true);
            }}
          >
            <Plus size={18} />

            Add member
          </button>

        </div>

      </div>


      {/* ====================================================
          SEARCH RESULTS
      ==================================================== */}

      {query && (
        <div className="search-results">

          <Search size={15} />

          <span>
            {matches.length}{" "}
            result
            {matches.length !== 1
              ? "s"
              : ""}
          </span>


          {matches.length > 0 && (

            <div
              style={{
                display: "flex",
                gap: 6,
                flexWrap: "wrap",
                marginLeft: 8,
              }}
            >

              {matches
                .slice(0, 8)
                .map((member) => (

                  <button
                    key={
                      member._id
                    }
                    type="button"
                    className="secondary"
                    style={{
                      padding:
                        "5px 9px",
                      fontSize:
                        "11px",
                    }}
                    onClick={() =>
                      selectSearchMember(
                        member
                      )
                    }
                  >
                    {member.fullName}
                  </button>

                ))}

            </div>

          )}

        </div>
      )}


      {/* ====================================================
          LEGEND
      ==================================================== */}

      <div className="generation-legend">

        <span>
          <i />
          Parent → Child
        </span>

        <span>
          <b
            style={{
              color: "#b58b52",
            }}
          >
            ♥
          </b>{" "}
          Spouse
        </span>

        <span>
          Same horizontal row =
          same generation
        </span>

      </div>


      {/* ====================================================
          TREE CANVAS
      ==================================================== */}

      <div className="canvas-wrap tree-canvas">

        {loading ? (

          <div className="loading">

            <div>
              Growing your
              family tree…
            </div>

          </div>

        ) : loadError ? (

          <div
            className="loading"
            style={{
              color: "#a23c2f",
            }}
          >

            <div>

              <strong>
                Unable to load tree
              </strong>

              <p>
                {loadError}
              </p>

              <button
                className="primary"
                onClick={
                  loadTree
                }
              >
                Try again
              </button>

            </div>

          </div>

        ) : members.length === 0 ? (

          <div className="loading">

            <div
              style={{
                textAlign: "center",
              }}
            >

              <div
                style={{
                  fontSize: 48,
                  marginBottom: 12,
                }}
              >
                🌳
              </div>

              <h3>
                Your family tree
                starts here
              </h3>

              <p>
                Add your first family
                member to begin.
              </p>

              <button
                className="primary"
                onClick={() =>
                  setShowAdd(true)
                }
              >
                <Plus size={18} />

                Add first member
              </button>

            </div>

          </div>

        ) : (

          <Canvas
            nodes={nodes}
            edges={edges}
            onSelect={setSelected}
          />

        )}

      </div>


      {/* ====================================================
          DETAILS PANEL
      ==================================================== */}

      <Details
        member={selected}

        close={() =>
          setSelected(null)
        }

        onAdd={() =>
          setShowAdd(true)
        }

        onEdit={openEdit}

        onDelete={
          deleteMember
        }
      />


      {/* ====================================================
          ADD MODAL
      ==================================================== */}

      {showAdd && (
        <AddModal
          anchor={selected}

          onClose={() =>
            setShowAdd(false)
          }

          onSaved={loadTree}
        />
      )}


      {/* ====================================================
          EDIT MODAL
      ==================================================== */}

      {showEdit &&
        selected && (
          <EditModal
            member={selected}

            onClose={() =>
              setShowEdit(false)
            }

            onSaved={async () => {
              await loadTree();

              // Close the details panel after
              // refreshing the member data.
              setSelected(null);
            }}
          />
        )}

    </div>
  );
}