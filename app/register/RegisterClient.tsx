"use client";

import Link from "next/link";
import { useState } from "react";
import { Client, Account, Databases, ID } from "appwrite";
import {
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/solid";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import zxcvbn from "zxcvbn";

// ─────────────────────────────────────────────
// APPWRITE INIT
// ─────────────────────────────────────────────
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const account = new Account(client);
const databases = new Databases(client);

// ─────────────────────────────────────────────
// REGISTER CLIENT
// ─────────────────────────────────────────────
export default function RegisterClient() {
  // FORM STATE
  const [formData, setFormData] = useState({
    first_name: "",
    surname: "",
    house: "",
    street: "",
    town: "",
    county: "",
    postcode: "",
    phone: "",
    email: "",
    password: "",
    confirm: "",
    agree: false,
  });

  const [addresses, setAddresses] = useState<string[]>([]);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [addressLoading, setAddressLoading] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);

  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Password strength
  const [passwordStrength, setPasswordStrength] = useState({
    label: "",
    color: "",
    score: 0,
  });

  // UK POSTCODE REGEX
  const ukPostcodeRegex =
    /^([GIR] 0AA|[A-PR-UWYZ][A-HK-Y]?[0-9][0-9ABEHMNPRV-Y]?\s?[0-9][ABD-HJLNP-UW-Z]{2})$/i;

  const calculateStrength = (password: string) => {
    const result = zxcvbn(password);
    const score = result.score;
    const map = [
      { label: "Very Weak", color: "bg-red-600" },
      { label: "Weak", color: "bg-orange-500" },
      { label: "Fair", color: "bg-yellow-500" },
      { label: "Strong", color: "bg-green-600" },
      { label: "Very Strong", color: "bg-blue-600" },
    ];
    return {
      label: map[score].label,
      color: map[score].color,
      score,
    };
  };

  // ─────────────────────────────────────────────
  // VALIDATION
  // ─────────────────────────────────────────────
  const validateFields = () => {
    const errors: Record<string, string> = {};

    if (!formData.first_name.trim()) errors.first_name = "Required";
    if (!formData.surname.trim()) errors.surname = "Required";

    const pc = formData.postcode.trim().toUpperCase();
    if (!pc) errors.postcode = "Required";
    else if (!ukPostcodeRegex.test(pc)) errors.postcode = "Invalid postcode";

    if (!formData.house.trim()) errors.house = "Required";
    if (!formData.street.trim()) errors.street = "Required";
    if (!formData.town.trim()) errors.town = "Required";
    if (!formData.county.trim()) errors.county = "Required";

    // PHONE
    if (!formData.phone.trim()) errors.phone = "Required";
    else {
      const parsed = parsePhoneNumberFromString(formData.phone, "GB");
      if (!parsed || !parsed.isValid()) errors.phone = "Invalid UK number";
    }

    // EMAIL
    if (!/^\S+@\S+\.\S+$/.test(formData.email))
      errors.email = "Invalid email address";

    // PASSWORD
    if (formData.password.length < 8) errors.password = "Minimum 8 characters";

    if (formData.password !== formData.confirm)
      errors.confirm = "Passwords do not match";

    // TERMS
    if (!formData.agree) errors.agree = "You must agree to the Terms";

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ─────────────────────────────────────────────
  // FORM INPUT HANDLER
  // ─────────────────────────────────────────────
  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    const val = type === "checkbox" ? checked : value;

    setFormData((prev) => ({ ...prev, [name]: val }));
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));

    if (name === "password") {
      setPasswordStrength(calculateStrength(value));
    }
  };

  // ─────────────────────────────────────────────
  // ADDRESS LOOKUP
  // ─────────────────────────────────────────────
  const handleFindAddress = async () => {
    if (!formData.postcode.trim()) {
      setError("Enter a postcode first.");
      return;
    }
    setError("");
    setAddresses([]);
    setSelectedAddress("");
    setAddressLoading(true);

    try {
      const res = await fetch(
        `/api/getaddress?postcode=${encodeURIComponent(formData.postcode)}`
      );

      const data = await res.json();

      if (!res.ok) {
        console.error("Address lookup error:", data);
        setError(data.error || "Failed to find address.");
        return;
      }

      const cleaned = (data.addresses || [])
        .map((addr: string) =>
          addr
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
            .join(", ")
        )
        .filter(Boolean)
        .sort((a: string, b: string) =>
          a.localeCompare(b, undefined, { numeric: true })
        );

      setAddresses(cleaned);
    } catch (err) {
      console.error("Address lookup error:", err);
      setError("Failed to find address.");
    } finally {
      setAddressLoading(false);
    }
  };

  const handleSelectAddress = (address: string) => {
    setSelectedAddress(address);
    const parts = address.split(",").map((p) => p.trim());

    setFormData((prev) => ({
      ...prev,
      house: parts[0] || "",
      street: parts[1] || "",
      town: parts[parts.length - 2] || "",
      county: parts[parts.length - 1] || "",
      postcode: prev.postcode.toUpperCase(),
    }));
  };

  // ─────────────────────────────────────────────
  // SUBMIT FORM
  // ─────────────────────────────────────────────
  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!validateFields()) return;

    setLoading(true);

    try {
      // Create user
      await account.create(
        ID.unique(),
        formData.email,
        formData.password,
        `${formData.first_name} ${formData.surname}`
      );

      // Create session
      await account.createEmailPasswordSession(formData.email, formData.password);

      // Send verification
      const verifyUrl = `${window.location.origin.replace(/\/$/, "")}/verified`;
      await account.createVerification(verifyUrl);

      // Save profile
      await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_PROFILES_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID!,
        ID.unique(),
        {
          first_name: formData.first_name,
          surname: formData.surname,
          house: formData.house,
          street: formData.street,
          town: formData.town,
          county: formData.county,
          postcode: formData.postcode.toUpperCase(),
          phone: formData.phone,
          email: formData.email,
          agree_to_terms: true,
        }
      );

      setSuccess(true);
      setFormData({
        first_name: "",
        surname: "",
        house: "",
        street: "",
        town: "",
        county: "",
        postcode: "",
        phone: "",
        email: "",
        password: "",
        confirm: "",
        agree: false,
      });
      setAddresses([]);
      setSelectedAddress("");
      setManualEntry(false);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────
  // INPUT COMPONENT
  // ─────────────────────────────────────────────
  const renderInput = (
    name: string,
    placeholder: string,
    type = "text",
    toggle = false
  ) => {
    const value = (formData as any)[name];
    const err = fieldErrors[name];
    const isPassword = type === "password";

    const visible =
      name === "password"
        ? showPassword
        : name === "confirm"
        ? showConfirm
        : false;

    const toggleFn =
      name === "password"
        ? () => setShowPassword((s) => !s)
        : () => setShowConfirm((s) => !s);

    return (
      <div className="relative">
        <input
          type={isPassword && visible ? "text" : type}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          className={`border rounded-md px-3 py-2 w-full pr-10 text-sm bg-white text-gray-900 ${
            err
              ? "border-red-500 bg-red-50"
              : value
              ? "border-green-500"
              : "border-gray-300"
          }`}
        />

        {value && !err && (
          <CheckCircleIcon className="w-5 h-5 text-green-600 absolute right-2 top-2.5" />
        )}
        {err && (
          <XCircleIcon className="w-5 h-5 text-red-500 absolute right-2 top-2.5" />
        )}

        {toggle && (
          <button
            type="button"
            onClick={toggleFn}
            className="absolute right-8 top-2.5 text-gray-600 cursor-pointer"
          >
            {visible ? (
              <EyeSlashIcon className="w-5 h-5" />
            ) : (
              <EyeIcon className="w-5 h-5" />
            )}
          </button>
        )}

        {err && <p className="text-xs text-red-400 mt-1">{err}</p>}
      </div>
    );
  };

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-black flex items-center justify-center px-4 py-10 text-gray-100">
      <div className="w-full max-w-lg bg-[#111111] shadow-lg rounded-2xl border border-yellow-700/60 p-8">
        <h1 className="text-2xl font-extrabold text-yellow-400 text-center mb-1">
          Create your AuctionMyCamera account
        </h1>
        <p className="text-xs text-gray-300 text-center mb-5">
          One account to bid on gear, list items for auction, and manage your activity.
        </p>

        {error && (
          <p className="bg-red-900/40 text-red-200 border border-red-500 p-2 rounded-md mb-4 text-xs text-center">
            {error}
          </p>
        )}

        {success && (
          <p className="bg-green-900/40 text-green-200 border border-green-500 p-2 rounded-md mb-4 text-xs text-center">
            ✅ Registration successful. Please check your email and click the link to verify your account before logging in.
          </p>
        )}

        {!success && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {renderInput("first_name", "First Name")}
              {renderInput("surname", "Surname")}
            </div>

            {!manualEntry && (
              <>
                <div className="flex gap-2">
                  <div className="flex-1">{renderInput("postcode", "ENTER POSTCODE")}</div>
                  <button
                    type="button"
                    onClick={handleFindAddress}
                    disabled={addressLoading}
                    className="bg-yellow-500 hover:bg-yellow-600 text-black px-4 py-2 rounded-md text-xs font-semibold whitespace-nowrap disabled:opacity-60"
                  >
                    {addressLoading ? "Searching…" : "Find"}
                  </button>
                </div>

                {addresses.length > 0 && (
                  <select
                    className="border rounded-md px-3 py-2 w-full text-sm mt-1 bg-[#111111] text-gray-100 border-gray-600"
                    value={selectedAddress}
                    onChange={(e) => handleSelectAddress(e.target.value)}
                  >
                    <option value="">Select Address</option>
                    {addresses.map((a, i) => (
                      <option key={i} className="bg-black text-gray-100">
                        {a}
                      </option>
                    ))}
                  </select>
                )}

                <p
                  className="text-xs text-yellow-300 underline cursor-pointer text-center mt-1"
                  onClick={() => setManualEntry(true)}
                >
                  Can&apos;t find your address? Enter manually
                </p>
              </>
            )}

            {(manualEntry || selectedAddress) && (
              <>
                {renderInput("house", "House Name or Number")}
                {renderInput("street", "Street")}
                {renderInput("town", "Town or City")}
                {renderInput("county", "County")}
                {renderInput("postcode", "Postcode")}

                {manualEntry && (
                  <p
                    className="text-xs text-yellow-300 underline cursor-pointer text-center"
                    onClick={() => setManualEntry(false)}
                  >
                    Use postcode lookup instead
                  </p>
                )}
              </>
            )}

            {renderInput("phone", "Phone Number")}
            {renderInput("email", "Email Address", "email")}
            {renderInput("password", "Password", "password", true)}

            {formData.password && (
              <div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-2 rounded-full ${passwordStrength.color}`}
                    style={{ width: `${(passwordStrength.score / 4) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-300 mt-1">{passwordStrength.label}</p>
              </div>
            )}

            {renderInput("confirm", "Confirm Password", "password", true)}

            <div className="flex items-start gap-2 mt-2">
              <input
                type="checkbox"
                name="agree"
                checked={formData.agree}
                onChange={handleChange}
                className="mt-1"
              />
              <label className="text-xs text-gray-200">
                I agree to the{" "}
                <Link href="/terms" className="text-yellow-300 underline" target="_blank" rel="noreferrer">
                  Terms &amp; Conditions
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-yellow-300 underline" target="_blank" rel="noreferrer">
                  Privacy Policy
                </Link>
                .
              </label>
            </div>
            {fieldErrors.agree && <p className="text-xs text-red-400">{fieldErrors.agree}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-yellow-500 hover:bg-yellow-600 text-black py-2.5 rounded-md font-semibold text-sm disabled:opacity-60"
            >
              {loading ? "Creating your account…" : "Create account"}
            </button>

            <p className="text-[11px] text-gray-400 text-center mt-2">
              Already registered?{" "}
              <Link href="/login" className="text-yellow-300 underline font-semibold">
                Login here
              </Link>
              .
            </p>
          </form>
        )}
      </div>
    </main>
  );
}